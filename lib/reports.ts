import { createClient } from "@/lib/supabase/server";
import type { Assessment } from "@/types/assessment";
import type { IssueRead, Issue, IssueCriteriaItem } from "@/types/issue";
import type { Tag } from "@/types/tag";

/**
 *
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
      if (
        mapped.description != null &&
        typeof mapped.description !== "string"
      ) {
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

/**
 *
 *
 * Constructs the AssessmentInput payload for the model from an assessment id.
 * - Reuses fetchAssessmentIssuesRaw to get assessment + issues
 * - Normalizes issue severities to buckets and WCAG entries via wcag/reference
 * - Computes stats: by_severity, by_principle, by_wcag (unique issue counts)
 * - Validates final structure with assessmentInputSchema
 */
import { assessmentInputSchema } from "@/lib/validation/report";
import type { AssessmentInput, AssessmentIssueInput } from "@/types/report";
import {
  mapSeverityToBucket,
  EMPTY_SEVERITY_COUNTS,
} from "@/lib/issues/constants";
import { getWcagByCode, normalizeCriteria } from "@/lib/wcag/reference";

export async function buildAssessmentReportInput(
  assessmentId: string,
): Promise<AssessmentInput> {
  const { assessment, issues } = await fetchAssessmentIssuesRaw(assessmentId);
  if (!assessment) {
    throw new Error("Assessment not found or access denied");
  }

  // Assessment meta
  const date = (() => {
    const d = new Date(assessment.created_at);
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    return d.toISOString().slice(0, 10);
  })();

  // Normalize issues into AssessmentIssueInput[]
  const issuesOut: AssessmentIssueInput[] = (issues || []).map((issue) => {
    // Build wcag entries combining aggregated criteria and code list
    const wcag = normalizeCriteria({
      fromAgg: (issue.criteria || []).map((c) => ({
        code: c.code,
        level: c.level,
        versions: c.version ? [c.version] : undefined,
      })),
      fromCodes: issue.criteria_codes || [],
    });

    return {
      id: issue.id,
      title: issue.title,
      description: issue.description || undefined,
      severity: mapSeverityToBucket(issue.severity),
      wcag: wcag,
      component: undefined, // no component field in Issue; reserved for future use
      url: issue.url || undefined,
      impact: issue.impact || undefined,
    };
  });

  // Stats by severity
  const bySeverity = { ...EMPTY_SEVERITY_COUNTS };
  for (const it of issuesOut) {
    bySeverity[it.severity] = (bySeverity[it.severity] || 0) + 1;
  }

  // Stats by principle (unique issues per principle)
  const byPrinciple = {
    Perceivable: 0,
    Operable: 0,
    Understandable: 0,
    Robust: 0,
  };
  const ref = getWcagByCode();
  for (const issue of issuesOut) {
    const seenPrinciples = new Set<string>();
    for (const w of issue.wcag || []) {
      const detail = ref.get(w.criterion);
      if (detail) seenPrinciples.add(detail.principle);
    }
    // Count this issue once per principle it touches
    for (const p of seenPrinciples) {
      // @ts-expect-error narrowed by keys above
      byPrinciple[p] = (byPrinciple[p] || 0) + 1;
    }
  }

  // Stats by WCAG (group by code; unique issues per code)
  const issuesByCode = new Map<string, Set<string>>(); // code -> set(issueId)
  for (const issue of issuesOut) {
    const id = issue.id;
    for (const w of issue.wcag || []) {
      const set = issuesByCode.get(w.criterion) || new Set<string>();
      set.add(id);
      issuesByCode.set(w.criterion, set);
    }
  }
  // Build sorted array with names
  const byWcagArr = Array.from(issuesByCode.entries())
    .map(([code, set]) => {
      const detail = ref.get(code);
      return {
        criterion: code,
        name: detail?.name || `Unknown criterion ${code}`,
        count: set.size,
      };
    })
    .sort((a, b) =>
      a.criterion < b.criterion ? -1 : a.criterion > b.criterion ? 1 : 0,
    );

  const payload = {
    assessment: { id: assessment.id, name: assessment.name, date },
    stats: {
      by_severity: bySeverity,
      by_principle: byPrinciple,
      by_wcag: byWcagArr,
    },
    issues: issuesOut,
  };

  // Validate and return
  const parsed = assessmentInputSchema.parse(payload);
  return parsed as AssessmentInput;
}
