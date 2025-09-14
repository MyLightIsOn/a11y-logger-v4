import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Tag } from "@/types/tag";
import type {
  Issue,
  IssueRead,
  IssueCriteriaItem,
  WcagCriterion,
  UpdateIssueRequest,
} from "@/types/issue";
import { updateIssueSchema } from "@/lib/validation/issues";

/**
 * GET /api/issues/[id]
 * Optional query: includeCriteria=true|false (default true)
 * Returns IssueRead for the authenticated user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    // Await params per Next.js dynamic API requirement. Learn more: https://nextjs.org/docs/messages/sync-dynamic-apis
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing issue id" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const includeCriteriaParam = searchParams.get("includeCriteria");
    const includeCriteria =
      includeCriteriaParam === null ? true : includeCriteriaParam === "true";

    // Fetch issue with joined tags (if any), ensuring it belongs to the current user
    const { data: issueRow, error: issueErr } = await supabase
      .from("issues")
      .select(
        `
        id,
        title,
        description,
        severity,
        suggested_fix,
        impact,
        url,
        selector,
        code_snippet,
        screenshots,
        status,
        created_at,
        updated_at,
        user_id,
        issues_tags(
          tags(*)
        )
      `,
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (issueErr) {
      // If not found, return 404
      if (
        (issueErr as { code?: string }).code === "PGRST116" /* row not found */
      ) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      console.error("Error fetching issue:", issueErr);
      return NextResponse.json(
        { error: "Failed to fetch issue" },
        { status: 500 },
      );
    }

    type IssueRowWithJoin = Issue & { issues_tags?: { tags: Tag }[] };
    const row = issueRow as unknown as IssueRowWithJoin;

    const { issues_tags, ...rest } = row;
    const baseIssue: Issue = {
      ...(rest as Issue),
      // tags will be flattened below onto IssueRead
    };

    const tags: Tag[] = (issues_tags ?? []).map((it) => it.tags);

    // Fetch linked assessment via join table assessments_issues
    let assessmentRef:
      | { id: string; name: string; wcag_version: string }
      | undefined = undefined;
    try {
      const { data: assessJoins, error: assessErr } = await supabase
        .from("assessments_issues")
        .select(`assessments(id, name, wcag_version)`)
        .eq("issue_id", id)
        .limit(1);
      if (assessErr) {
        console.error("Error fetching assessment join:", assessErr);
      } else if (Array.isArray(assessJoins) && assessJoins.length > 0) {
        const rel = (assessJoins[0] as unknown as { assessments: unknown })
          .assessments as unknown;
        const a = Array.isArray(rel)
          ? (rel[0] as
              | { id: string; name: string; wcag_version: string }
              | undefined)
          : (rel as { id: string; name: string; wcag_version: string } | null);
        if (a) {
          assessmentRef = {
            id: a.id,
            name: a.name,
            wcag_version: a.wcag_version,
          };
        }
      }
    } catch (e) {
      console.error("Unhandled error fetching assessment join:", e);
    }

    let criteriaItems: IssueCriteriaItem[] = [];
    if (includeCriteria) {
      // Fetch linked WCAG criteria via join table issue_criteria
      const { data: joinedCriteria, error: critErr } = await supabase
        .from("issue_criteria")
        .select(
          `
          wcag_criteria(id, code, name, version, level)
        `,
        )
        .eq("issue_id", id);

      if (critErr) {
        console.error("Error fetching issue criteria:", critErr);
      } else {
        type CriteriaJoinRow = {
          wcag_criteria: (WcagCriterion & { id: string }) | null;
        };
        const critRows = (joinedCriteria as unknown as CriteriaJoinRow[]) ?? [];
        criteriaItems = critRows
          .map((row) => row.wcag_criteria)
          .filter((c): c is WcagCriterion & { id: string } => Boolean(c))
          .map((c) => ({
            code: c.code,
            name: c.name,
            version: c.version,
            level: c.level,
          }));
      }
    }

    const criteria_codes = Array.from(
      new Set(criteriaItems.map((c) => c.code)),
    );

    const responseIssue: IssueRead = {
      ...(baseIssue as Omit<
        IssueRead,
        "tags" | "criteria" | "criteria_codes" | "assessment"
      >),
      tags,
      criteria: includeCriteria ? criteriaItems : undefined,
      criteria_codes: includeCriteria ? criteria_codes : undefined,
      assessment: assessmentRef
        ? (assessmentRef as unknown as IssueRead["assessment"])
        : undefined,
    };

    return NextResponse.json(responseIssue);
  } catch (error) {
    console.error("Unhandled error in GET /api/issues/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/issues/[id]
 * Updates an existing issue with partial data.
 * Returns the updated IssueRead.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing issue id" }, { status: 400 });
    }

    // Parse and validate request body
    let body: UpdateIssueRequest;
    try {
      const rawBody = await request.json();
      body = updateIssueSchema.parse(rawBody);
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseError },
        { status: 400 },
      );
    }

    // Verify issue exists and belongs to user
    const { data: existingIssue, error: existingErr } = await supabase
      .from("issues")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (existingErr || !existingIssue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    // Extract criteria from body for separate handling
    const { criteria, tag_ids, ...issueUpdate } = body;

    // Update the main issue record
    const { error: updateErr } = await supabase
      .from("issues")
      .update({
        ...issueUpdate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateErr) {
      console.error("Error updating issue:", updateErr);
      return NextResponse.json(
        { error: "Failed to update issue" },
        { status: 500 },
      );
    }

    // Handle criteria updates if provided (allow empty array to clear)
    if (criteria !== undefined) {
      // Remove existing criteria associations
      const { error: deleteErr } = await supabase
        .from("issue_criteria")
        .delete()
        .eq("issue_id", id);

      if (deleteErr) {
        console.error("Error removing existing criteria:", deleteErr);
        return NextResponse.json(
          { error: "Failed to update criteria" },
          { status: 500 },
        );
      }

      // Add new criteria associations if any
      if (criteria.length > 0) {
        // Resolve provided (version, code) pairs to wcag_criteria IDs
        const versions = Array.from(new Set(criteria.map((c) => c.version)));
        const codes = Array.from(new Set(criteria.map((c) => c.code)));

        let wcagRows: { id: string; code: string; version: string }[] = [];
        if (versions.length && codes.length) {
          const { data: wcagData, error: wcagErr } = await supabase
            .from("wcag_criteria")
            .select("id, code, version")
            .in("version", versions)
            .in("code", codes);
          if (wcagErr) {
            console.error("Error fetching WCAG criteria:", wcagErr);
            return NextResponse.json(
              { error: "Failed to lookup criteria" },
              { status: 500 },
            );
          }
          wcagRows = (wcagData ?? []) as { id: string; code: string; version: string }[];
        }

        // Filter to exact (version, code) pairs
        const wanted = new Set(
          criteria.map((c) => `${c.version}|${c.code}`),
        );
        const matched = wcagRows.filter((row) =>
          wanted.has(`${row.version}|${row.code}`),
        );

        // Create new associations
        const criteriaInserts = matched.map((criterion) => ({
          issue_id: id,
          criterion_id: criterion.id,
        }));

        if (criteriaInserts.length > 0) {
          const { error: insertErr } = await supabase
            .from("issue_criteria")
            .insert(criteriaInserts);

          if (insertErr) {
            console.error("Error inserting criteria:", insertErr);
            return NextResponse.json(
              { error: "Failed to update criteria" },
              { status: 500 },
            );
          }
        }
      }
    }

    // Handle tag updates if provided
    if (tag_ids) {
      // Remove existing tag associations
      const { error: deleteTagsErr } = await supabase
        .from("issues_tags")
        .delete()
        .eq("issue_id", id);

      if (deleteTagsErr) {
        console.error("Error removing existing tags:", deleteTagsErr);
        return NextResponse.json(
          { error: "Failed to update tags" },
          { status: 500 },
        );
      }

      // Add new tag associations if any
      if (tag_ids.length > 0) {
        const tagInserts = tag_ids.map((tagId) => ({
          issue_id: id,
          tag_id: tagId,
        }));

        const { error: insertTagsErr } = await supabase
          .from("issues_tags")
          .insert(tagInserts);

        if (insertTagsErr) {
          console.error("Error inserting tags:", insertTagsErr);
          return NextResponse.json(
            { error: "Failed to update tags" },
            { status: 500 },
          );
        }
      }
    }

    // Fetch the updated issue with all relationships (reusing GET logic)
    const { data: issueRow, error: issueErr } = await supabase
      .from("issues")
      .select(
        `
        id,
        title,
        description,
        severity,
        suggested_fix,
        impact,
        url,
        selector,
        code_snippet,
        screenshots,
        status,
        created_at,
        updated_at,
        user_id,
        issues_tags(
          tags(*)
        )
      `,
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (issueErr) {
      console.error("Error fetching updated issue:", issueErr);
      return NextResponse.json(
        { error: "Failed to fetch updated issue" },
        { status: 500 },
      );
    }

    type IssueRowWithJoin = Issue & { issues_tags?: { tags: Tag }[] };
    const row = issueRow as unknown as IssueRowWithJoin;

    const { issues_tags, ...rest } = row;
    const baseIssue: Issue = {
      ...(rest as Issue),
    };

    const tags: Tag[] = (issues_tags ?? []).map((it) => it.tags);

    // Fetch updated criteria
    let criteriaItems: IssueCriteriaItem[] = [];
    const { data: joinedCriteria, error: critErr } = await supabase
      .from("issue_criteria")
      .select(
        `
        wcag_criteria(id, code, name, version, level)
      `,
      )
      .eq("issue_id", id);

    if (critErr) {
      console.error("Error fetching updated criteria:", critErr);
    } else {
      type CriteriaJoinRow = {
        wcag_criteria: (WcagCriterion & { id: string }) | null;
      };
      const critRows = (joinedCriteria as unknown as CriteriaJoinRow[]) ?? [];
      criteriaItems = critRows
        .map((row) => row.wcag_criteria)
        .filter((c): c is WcagCriterion & { id: string } => Boolean(c))
        .map((c) => ({
          code: c.code,
          name: c.name,
          version: c.version,
          level: c.level,
        }));
    }

    const criteria_codes = Array.from(
      new Set(criteriaItems.map((c) => c.code)),
    );

    const responseIssue: IssueRead = {
      ...(baseIssue as Omit<IssueRead, "tags" | "criteria" | "criteria_codes">),
      tags,
      criteria: criteriaItems,
      criteria_codes,
    };

    return NextResponse.json(responseIssue);
  } catch (error) {
    console.error("Unhandled error in PATCH /api/issues/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}


export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing issue id" }, { status: 400 });
    }

    // Ensure issue belongs to user
    const { data: issueRow, error: issueErr } = await supabase
      .from("issues")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (issueErr || !issueRow || (issueRow as { user_id?: string }).user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete joins first to satisfy FK constraints
    await supabase.from("issues_tags").delete().eq("issue_id", id);
    await supabase.from("issue_criteria").delete().eq("issue_id", id);
    await supabase.from("assessments_issues").delete().eq("issue_id", id);

    const { error: delErr } = await supabase.from("issues").delete().eq("id", id);
    if (delErr) {
      console.error("Error deleting issue:", delErr);
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unhandled error in DELETE /api/issues/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
