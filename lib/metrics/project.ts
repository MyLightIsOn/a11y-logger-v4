import { createClient } from "@/lib/supabase/server";
import { mapSeverityToBucket, EMPTY_SEVERITY_COUNTS } from "@/lib/issues/constants";
import type { UUID } from "@/types/common";
import type { IssueRead, IssueCriteriaItem } from "@/types/issue";

export type CountsBySeverity = Readonly<{
  Critical: number;
  High: number;
  Medium: number;
  Low: number;
}>;

export type CountsByWcagLevel = Readonly<{
  A: number;
  AA: number;
  AAA: number;
}>;

export type OpenVsResolved = Readonly<{
  open: number;
  closed: number;
}>;

export type ProjectAccessibilityMetrics = Readonly<{
  countsBySeverity: CountsBySeverity;
  countsByWcagLevel: CountsByWcagLevel;
  openVsResolved: OpenVsResolved;
}>;

/**
 * Compute accessibility metrics for a given project.
 * - countsBySeverity: bucketed via mapSeverityToBucket (Critical/High/Medium/Low)
 * - countsByWcagLevel: counts of unique issues touching A/AA/AAA criteria (an issue can increment multiple levels)
 * - openVsResolved: counts of open vs closed ("archive" excluded from both)
 */
export async function computeProjectMetrics(projectId: UUID): Promise<ProjectAccessibilityMetrics> {
  const supabase = await createClient();

  // Auth context is embedded in supabase client; ensure user present for RLS
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // RLS requires user context; return empty metrics to avoid breaking publish
    return {
      countsBySeverity: { ...EMPTY_SEVERITY_COUNTS },
      countsByWcagLevel: { A: 0, AA: 0, AAA: 0 },
      openVsResolved: { open: 0, closed: 0 },
    };
  }

  // Fetch assessment IDs for the project
  const { data: paRows, error: paErr } = await supabase
    .from("projects_assessments")
    .select("assessment_id")
    .eq("project_id", projectId);
  if (paErr) throw paErr;

  const assessmentIds = Array.from(
    new Set(
      ((paRows || []) as { assessment_id: string }[])
        .map((r) => r.assessment_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );

  let issues: IssueRead[] = [];
  if (assessmentIds.length > 0) {
    // Fetch issues linked to any of the project's assessments, including criteria aggregation
    const { data: issueRows, error: issuesErr } = await supabase
      .from("issues")
      .select(
        `
        *,
        assessments_issues!inner(assessment_id),
        issue_criteria_agg!left(
          criteria
        )
      `,
      )
      .in("assessments_issues.assessment_id", assessmentIds)
      .eq("user_id", user.id);

    if (issuesErr) throw issuesErr;

    type IssueRowWithJoin = IssueRead & {
      issue_criteria_agg?: Array<{ criteria?: unknown[] }>;
    };

    issues = ((issueRows as unknown as IssueRowWithJoin[] | null) || []).map((row) => {
      const { issue_criteria_agg, ...rest } = row;
      const out: IssueRead = { ...(rest as IssueRead) };
      if (issue_criteria_agg?.[0]) {
        const agg = issue_criteria_agg[0];
        out.criteria = Array.isArray(agg.criteria)
          ? (agg.criteria as IssueCriteriaItem[])
          : [];
      } else {
        out.criteria = [];
      }
      return out;
    });
  }

  // 1) countsBySeverity (bucketed)
  const mutableSeverity = { Critical: 0, High: 0, Medium: 0, Low: 0 } as Record<keyof CountsBySeverity, number>;
  for (const issue of issues) {
    const bucket = mapSeverityToBucket(issue.severity);
    mutableSeverity[bucket] = (mutableSeverity[bucket] || 0) + 1;
  }
  const countsBySeverity: CountsBySeverity = {
    Critical: mutableSeverity.Critical,
    High: mutableSeverity.High,
    Medium: mutableSeverity.Medium,
    Low: mutableSeverity.Low,
  };

  // 2) countsByWcagLevel
  // For each issue, determine unique levels it touches via criteria[].level and increment those
  let A = 0, AA = 0, AAA = 0;
  for (const issue of issues) {
    const levels = new Set<("A" | "AA" | "AAA")>();
    for (const c of issue.criteria || []) {
      if (c && (c.level === "A" || c.level === "AA" || c.level === "AAA")) {
        levels.add(c.level);
      }
    }
    if (levels.has("A")) A += 1;
    if (levels.has("AA")) AA += 1;
    if (levels.has("AAA")) AAA += 1;
  }
  const countsByWcagLevel: CountsByWcagLevel = { A, AA, AAA };

  // 3) openVsResolved (treat "closed" as resolved; exclude "archive")
  let open = 0;
  let closed = 0;
  for (const issue of issues) {
    if (issue.status === "open") open += 1;
    else if (issue.status === "closed") closed += 1;
  }
  const openVsResolved: OpenVsResolved = { open, closed };

  return {
    countsBySeverity,
    countsByWcagLevel,
    openVsResolved,
  };
}
