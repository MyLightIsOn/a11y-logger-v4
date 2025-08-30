import { createClient } from "@/lib/supabase/server";
import type { Assessment } from "@/types/assessment";
import type { IssueRead, Issue, IssueCriteriaItem } from "@/types/issue";
import type { Tag } from "@/types/tag";

/**
 * Phase 1 — Step 4: Supabase data fetch: assessments and issues (join)
 *
 * Fetches a single assessment and its issues joined via assessments_issues.
 * Left-joins issue_criteria_agg when available to include criteria_codes and criteria[].
 * Deduplicates issues by issue.id and applies defensive null-handling for optional fields.
 *
 * Return: { assessment, issues }
 *  - assessment: the Assessment row or null if not found or not authorized
 *  - issues: IssueRead[] (empty array if none)
 */
export async function fetchAssessmentIssuesRaw(assessmentId: string): Promise<{
  assessment: Assessment | null;
  issues: IssueRead[];
}> {
  const supabase = await createClient();

  // Ensure user context for RLS and filtering
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Not authorized in current context
    return { assessment: null, issues: [] };
  }

  // 1) Fetch the assessment row (scoped to current user)
  const { data: assessmentRow, error: assessmentErr } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", assessmentId)
    .eq("user_id", user.id)
    .single();

  if (assessmentErr || !assessmentRow) {
    // Either not found or user not allowed
    return { assessment: null, issues: [] };
  }

  // 2) Fetch issues joined via the join table and left-join criteria aggregation
  const { data: issueRows, error: issuesErr } = await supabase
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
    .eq("assessments_issues.assessment_id", assessmentId)
    .eq("user_id", user.id);

  if (issuesErr) {
    // On query error, return empty issue list but still provide assessment meta
    return { assessment: assessmentRow as Assessment, issues: [] };
  }

  type IssueRowWithJoin = Issue & {
    issues_tags?: { tags: Tag }[];
    assessments_issues?: { assessment_id: string }[];
    issue_criteria_agg?: Array<{
      criteria_codes?: string[] | null;
      criteria?: IssueCriteriaItem[] | null;
    }> | null;
  };

  const list = ((issueRows as unknown as IssueRowWithJoin[] | null) || []).map(
    (row) => {
      const { issues_tags, issue_criteria_agg, ...rest } = row;

      const mapped: IssueRead = {
        // cast to IssueRead compatible fields
        ...(rest as unknown as IssueRead),
        // ensure optional arrays are present
        screenshots: Array.isArray((rest as Issue).screenshots)
          ? (rest as Issue).screenshots
          : [],
        tags: issues_tags?.map((it: { tags: Tag }) => it.tags) || [],
      };

      // Include criteria if available
      const agg = issue_criteria_agg?.[0];
      if (agg) {
        mapped.criteria_codes = Array.isArray(agg.criteria_codes)
          ? agg.criteria_codes.filter((c): c is string => typeof c === "string")
          : [];
        mapped.criteria = Array.isArray(agg.criteria)
          ? agg.criteria.filter(
              (c): c is IssueCriteriaItem => !!c && typeof c.code === "string",
            )
          : [];
      } else {
        mapped.criteria_codes = [];
        mapped.criteria = [];
      }

      // Defensive defaults for nullable text fields
      if (mapped.description != null && typeof mapped.description !== "string") {
        mapped.description = undefined;
      }
      if (mapped.impact != null && typeof mapped.impact !== "string") {
        mapped.impact = undefined;
      }
      if (mapped.url != null && typeof mapped.url !== "string") {
        mapped.url = undefined;
      }

      return mapped;
    },
  );

  // 3) Deduplicate by issue.id (safety if join returns duplicates)
  const byId = new Map<string, IssueRead>();
  for (const issue of list) {
    if (!byId.has(issue.id)) byId.set(issue.id, issue);
  }

  return {
    assessment: assessmentRow as Assessment,
    issues: Array.from(byId.values()),
  };
}
