import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { Tag } from "@/types/tag";
import type { Issue, CreateIssueRequest, IssueCriteriaItem, WcagVersion } from "@/types/issue";
import { validateCreateIssue } from "@/lib/validation/issues";

/**
 * Issues collection route
 * GET /api/issues?sortBy=created_at&sortOrder=asc|desc
 * Response: { data: Issue[]; count: number }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters (support only sortBy/sortOrder consistent with patterns)
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrderAsc = searchParams.get("sortOrder") === "asc"; // default desc if omitted

    // Fetch issues for the current user including tags when available
    // Assumes a join table `issues_tags` analogous to `projects_tags`
    const { data, error } = await supabase
      .from("issues")
      .select(
        `
        *,
        issues_tags(
          tags(*)
        )
      `,
      )
      .eq("user_id", user.id)
      .order(sortBy, { ascending: sortOrderAsc });

    if (error) {
      throw error;
    }

    // Flatten tags from the join table if present
    // Define the shape returned by Supabase for issues with joined tags
    type IssueRowWithJoin = Issue & { issues_tags?: { tags: Tag }[] };

    const transformedData =
      (data as IssueRowWithJoin[] | null)?.map((issue) => ({
        ...issue,
        tags: issue.issues_tags?.map((it: { tags: Tag }) => it.tags) || [],
      })) || [];

    return NextResponse.json({
      data: transformedData,
      count: transformedData.length,
    });
  } catch (error) {
    console.error("Error fetching issues:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/issues
 * Creates a new issue and links WCAG criteria and tags.
 * Request body must conform to CreateIssueRequest (validated with Zod).
 * Returns the created issue enriched with criteria arrays.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate input
    let payload: CreateIssueRequest;
    try {
      const body = await request.json();
      payload = validateCreateIssue(body);
    } catch (err: any) {
      const message = err?.issues?.[0]?.message || err?.message || "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // 1) Insert issue
    const issueInsert = {
      title: payload.title,
      description: payload.description || null,
      severity: payload.severity,
      status: payload.status,
      suggested_fix: payload.suggested_fix || null,
      impact: payload.impact || null,
      url: payload.url || null,
      selector: payload.selector || null,
      code_snippet: payload.code_snippet || null,
      screenshots: payload.screenshots || [],
      user_id: user.id,
    } as const;

    const { data: issueRow, error: insertErr } = await supabase
      .from("issues")
      .insert(issueInsert)
      .select("*")
      .single();

    if (insertErr || !issueRow) {
      console.error("Issue insert failed:", insertErr);
      return NextResponse.json({ error: "Failed to create issue" }, { status: 500 });
    }

    const issueId = (issueRow as any).id as string;

    // 2) Resolve each (version, code) to wcag_criteria.id
    // We'll fetch in a single query when possible by code IN and version IN, then filter pairs.
    const versions = Array.from(new Set(payload.criteria.map((c) => c.version)));
    const codes = Array.from(new Set(payload.criteria.map((c) => c.code)));

    let wcagRows: { id: string; code: string; version: WcagVersion; name: string; level: "A"|"AA"|"AAA" }[] = [];

    if (versions.length && codes.length) {
      const { data: wcagData, error: wcagErr } = await supabase
        .from("wcag_criteria")
        .select("id, code, version, name, level")
        .in("version", versions)
        .in("code", codes);
      if (wcagErr) {
        console.error("WCAG lookup failed:", wcagErr);
        return NextResponse.json({ error: "Failed to resolve WCAG criteria" }, { status: 500 });
      }
      wcagRows = (wcagData || []) as any;
    }

    // Map requested criteria to found ids; validate all resolved
    const criteriaKey = (v: WcagVersion, c: string) => `${v}|${c}`;
    const wcagMap = new Map<string, { id: string; code: string; version: WcagVersion; name: string; level: "A"|"AA"|"AAA" }>();
    for (const row of wcagRows) wcagMap.set(criteriaKey(row.version, row.code), row);

    const dedupPairs = new Map<string, { version: WcagVersion; code: string }>();
    for (const ref of payload.criteria) {
      const key = criteriaKey(ref.version, ref.code);
      dedupPairs.set(key, ref);
    }

    const linkRows: { issue_id: string; criterion_id: string }[] = [];
    for (const [, ref] of dedupPairs) {
      const found = wcagMap.get(criteriaKey(ref.version, ref.code));
      if (!found) {
        // Shouldn't happen due to validation allowlist, but guard anyway
        console.warn("WCAG criterion not found in DB despite validation:", ref);
        continue;
      }
      linkRows.push({ issue_id: issueId, criterion_id: found.id });
    }

    if (linkRows.length) {
      const { error: linkErr } = await supabase
        .from("issue_criteria")
        .upsert(linkRows, { onConflict: "issue_id,criterion_id", ignoreDuplicates: true });
      if (linkErr) {
        console.error("Inserting issue_criteria failed:", linkErr);
        return NextResponse.json({ error: "Failed to link criteria" }, { status: 500 });
      }
    }

    // 3) Insert tag relations if provided
    if (Array.isArray(payload.tag_ids) && payload.tag_ids.length) {
      const uniqueTagIds = Array.from(new Set(payload.tag_ids));
      const tagRows = uniqueTagIds.map((tag_id) => ({ issue_id: issueId, tag_id }));
      const { error: tagsErr } = await supabase
        .from("issues_tags")
        .upsert(tagRows, { onConflict: "issue_id,tag_id", ignoreDuplicates: true });
      if (tagsErr) {
        console.error("Inserting issues_tags failed:", tagsErr);
        return NextResponse.json({ error: "Failed to link tags" }, { status: 500 });
      }
    }

    // 4) Build enriched response: include joined tags and aggregated criteria arrays
    // Fetch tags via join like GET
    const { data: issueWithTags, error: fetchIssueErr } = await supabase
      .from("issues")
      .select(
        `
        *,
        issues_tags(
          tags(*)
        )
      `,
      )
      .eq("id", issueId)
      .single();

    if (fetchIssueErr) {
      console.error("Fetching created issue failed:", fetchIssueErr);
    }

    // Fetch criteria for the issue by joining through issue_criteria
    const { data: joinedCriteria, error: critErr } = await supabase
      .from("issue_criteria")
      .select(
        `
        wcag_criteria(id, code, name, version, level)
      `,
      )
      .eq("issue_id", issueId);

    if (critErr) {
      console.error("Fetching issue criteria failed:", critErr);
    }

    const tags = (issueWithTags?.issues_tags as any[] | undefined)?.map((it) => it.tags) || [];

    const criteriaItems: IssueCriteriaItem[] = ((joinedCriteria as any[]) || [])
      .map((row: any) => row.wcag_criteria)
      .filter(Boolean)
      .map((c: any) => ({
        code: c.code,
        name: c.name,
        version: c.version as WcagVersion,
        level: c.level,
      }));

    const criteria_codes = Array.from(new Set(criteriaItems.map((c) => c.code)));

    // Construct response object similar to Issue but with criteria arrays and flattened tags
    const responseIssue = {
      ...(issueWithTags || issueRow),
      tags,
      criteria: criteriaItems,
      criteria_codes,
    };

    return NextResponse.json(responseIssue, { status: 201 });
  } catch (error) {
    console.error("Error creating issue:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
