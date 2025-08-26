import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Tag } from "@/types/tag";
import type { Issue } from "@/types/issue";

/**
 * GET /api/assessments/:id/issues
 * Returns issues linked to a given assessment along with severity stats.
 * Response shape mirrors existing list endpoints and adds `stats`.
 * {
 *   data: Issue[];
 *   count: number;
 *   stats: { critical: number; high: number; medium: number; low: number }
 * }
 */
export async function GET(
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

    // Query issues joined to this assessment via the join table.
    // Start from issues and inner-join assessments_issues to filter by assessment_id.
    // Include criteria information from issue_criteria_agg
    const { data, error } = await supabase
      .from("issues")
      .select(
        `
        *,
        issues_tags(tags(*)),
        assessments_issues!inner(assessment_id),
        issue_criteria_agg!left(
          criteria_codes,
          criteria
        )
      `,
      )
      .eq("assessments_issues.assessment_id", id)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    // Flatten tags from the join table if present and include criteria
    type IssueRowWithJoin = Issue & {
      issues_tags?: { tags: Tag }[];
      assessments_issues?: { assessment_id: string }[];
      issue_criteria_agg?: {
        criteria_codes?: string[];
        criteria?: any;
      };
    };

    const issues: Issue[] = ((data as IssueRowWithJoin[] | null) || []).map(
      (row) => {
        const { issues_tags, assessments_issues, issue_criteria_agg, ...rest } =
          row;
        const transformed: any = {
          ...(rest as Issue),
          tags: issues_tags?.map((it: { tags: Tag }) => it.tags) || [],
        };

        // Include criteria information if available
        if (issue_criteria_agg[0]) {
          transformed.criteria_codes =
            issue_criteria_agg[0].criteria_codes || [];
          transformed.criteria = issue_criteria_agg[0].criteria || [];
        }

        return transformed;
      },
    );

    // Build severity stats. Severity values are "1" | "2" | "3" | "4"
    // Map to labels Critical, High, Medium, Low accordingly.
    const stats = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    } as const;
    // Create a mutable copy to accumulate
    const counts: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    } = { ...stats };

    for (const issue of issues) {
      switch (issue.severity) {
        case "1":
          counts.critical += 1;
          break;
        case "2":
          counts.high += 1;
          break;
        case "3":
          counts.medium += 1;
          break;
        case "4":
          counts.low += 1;
          break;
        default:
          // Unknown severity is ignored for stats to keep typing strict
          break;
      }
    }

    return NextResponse.json({
      data: issues,
      count: issues.length,
      stats: counts,
    });
  } catch (error) {
    console.error("Error fetching assessment issues:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
