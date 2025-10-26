import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "@/types/common";
import type { IssueRead } from "@/types/issue";
import { generateForCriterion } from "@/lib/vpat/generation";

export type GenerateRemarksResponse = {
  conformance: string;
  remarks: string;
  related_issue_ids: UUID[];
  related_issue_urls: string[];
  warning?: string;
};

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ vpatId: UUID; criterionId: UUID }> },
) {
  try {
    const supabase = await createClient();

    // Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { vpatId: rawVpatId, criterionId: rawCriterionId } = await ctx.params;

    const vpatId = (rawVpatId as string).split(":")[0] as UUID;
    const criterionId = (rawCriterionId as string).split(":")[0] as UUID;

    // Resolve VPAT and project id
    const { data: vpatRow, error: vpatErr } = await supabase
      .from("vpat")
      .select("id, project_id")
      .eq("id", vpatId)
      .single();

    if (vpatErr || !vpatRow) {
      return NextResponse.json({ error: "VPAT not found" }, { status: 404 });
    }
    const projectId = (vpatRow as { project_id: UUID }).project_id;

    // Fetch project name (for template substitutions)
    const { data: projectRow } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .maybeSingle();
    const projectName = (projectRow as { name?: string } | null)?.name || undefined;

    // Resolve WCAG criterion code from id
    const { data: wcagRow, error: wcagErr } = await supabase
      .from("wcag_criteria")
      .select("id, code")
      .eq("id", criterionId)
      .single();
    if (wcagErr || !wcagRow) {
      return NextResponse.json(
        { error: "WCAG criterion not found" },
        { status: 404 },
      );
    }
    const criterionCode = (wcagRow as { code: string }).code;

    // Fetch assessment IDs for this project
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
        .in("assessments_issues.assessment_id", assessmentIds)
        .eq("user_id", user.id)
        .eq("status", "open");

      if (issuesErr) throw issuesErr;

      type IssueRowWithJoin = IssueRead & {
        issues_tags?: { tags: unknown }[];
        issue_criteria_agg?: Array<{
          criteria_codes?: string[];
          criteria?: unknown[];
        }>;
      };

      const mapped: IssueRead[] = (
        (issueRows as unknown as IssueRowWithJoin[] | null) || []
      ).map((row) => {
        const { issue_criteria_agg, issues_tags: _omitTags, ...rest } = row;
        void _omitTags;
        const out: IssueRead = { ...(rest as IssueRead) };
        if (issue_criteria_agg?.[0]) {
          const agg = issue_criteria_agg[0];
          out.criteria_codes = Array.isArray(agg.criteria_codes)
            ? agg.criteria_codes
            : [];
          out.criteria = Array.isArray(agg.criteria)
            ? (agg.criteria as IssueRead["criteria"])
            : [];
        }
        return out;
      });
      issues = mapped;
    }

    // Pure generation (no persistence)
    const suggestion = generateForCriterion({
      projectId,
      projectName,
      criterionCode,
      issues,
    });

    const response: GenerateRemarksResponse = {
      conformance: suggestion.conformance,
      remarks: suggestion.remarks,
      related_issue_ids: suggestion.related_issue_ids,
      related_issue_urls: suggestion.related_issue_urls,
      warning: suggestion.warning,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error generating VPAT remarks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
