import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Tag } from "@/types/tag";
import type {
  Issue,
  IssueRead,
  IssueCriteriaItem,
  WcagCriterion,
} from "@/types/issue";

/**
 * GET /api/issues/[id]
 * Optional query: includeCriteria=true|false (default true)
 * Returns IssueRead for the authenticated user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
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

    // This await is necessary to ensure the params are resolved before proceeding. Learn more: https://nextjs.org/docs/messages/sync-dynamic-apis
    const id = await params?.id;
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
        *,
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
    const row = issueRow as IssueRowWithJoin;

    const { issues_tags, ...rest } = row;
    const baseIssue: Issue = {
      ...(rest as Issue),
      // tags will be flattened below onto IssueRead
    };

    const tags: Tag[] = (issues_tags ?? []).map((it) => it.tags);

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
      ...(baseIssue as Omit<IssueRead, "tags" | "criteria" | "criteria_codes">),
      tags,
      criteria: includeCriteria ? criteriaItems : undefined,
      criteria_codes: includeCriteria ? criteria_codes : undefined,
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
