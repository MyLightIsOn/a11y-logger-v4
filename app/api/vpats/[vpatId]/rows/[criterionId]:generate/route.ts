import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "@/types/common";
import type { VpatRowDraft } from "@/types/vpat";
import type { IssueRead } from "@/types/issue";
import { generateForCriterion } from "@/lib/vpat/generation";

type Params = { params: { vpatId: UUID; criterionId: UUID } };

interface GenerateResponse {
  status: "UPDATED" | "INSERTED" | "SKIPPED";
  row: VpatRowDraft | null;
  warning?: string;
}

export async function POST(_request: NextRequest, ctx: Params) {
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

    const vpatId = ctx.params.vpatId as UUID;
    const criterionId = ctx.params.criterionId as UUID;

    // Resolve VPAT and project id (and ensure accessible via RLS)
    const { data: vpatRow, error: vpatErr } = await supabase
      .from("vpat")
      .select("id, project_id")
      .eq("id", vpatId)
      .single();

    if (vpatErr || !vpatRow) {
      return NextResponse.json({ error: "VPAT not found" }, { status: 404 });
    }
    const projectId = (vpatRow as { project_id: UUID }).project_id;

    // Resolve WCAG criterion code from id
    const { data: wcagRow, error: wcagErr } = await supabase
      .from("wcag_criteria")
      .select("id, code")
      .eq("id", criterionId)
      .single();
    if (wcagErr || !wcagRow) {
      return NextResponse.json({ error: "WCAG criterion not found" }, { status: 404 });
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
      // Fetch issues linked to any of the project's assessments, including criteria aggregation
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

      // Flatten joins into IssueRead[] similar to other endpoints
      type IssueRowWithJoin = IssueRead & {
        issues_tags?: { tags: unknown }[];
        issue_criteria_agg?: Array<{ criteria_codes?: string[]; criteria?: unknown[] }>;
      };

      const mapped: IssueRead[] = ((issueRows as unknown as IssueRowWithJoin[] | null) || []).map(
        (row) => {
          const { issue_criteria_agg, issues_tags: _omitTags, ...rest } = row;
          void _omitTags;
          const out: IssueRead = { ...(rest as IssueRead) };
          if (issue_criteria_agg?.[0]) {
            const agg = issue_criteria_agg[0];
            out.criteria_codes = Array.isArray(agg.criteria_codes)
              ? agg.criteria_codes
              : [];
            // criteria array is optional; we don't need to fully materialize for generation
            // but keep as-is if present when available
            out.criteria = Array.isArray(agg.criteria)
              ? (agg.criteria as IssueRead["criteria"])
              : [];
          }
          return out;
        },
      );
      issues = mapped;
    }

    // Call generator with injected issues for purity
    const suggestion = generateForCriterion({ projectId, criterionCode, issues });

    // No-overwrite guard: if an existing row has content, skip
    const { data: existingRow, error: existingErr } = await supabase
      .from("vpat_row_draft")
      .select("*")
      .eq("vpat_id", vpatId)
      .eq("wcag_criterion_id", criterionId)
      .single();

    if (existingErr && existingErr.code !== "PGRST116") {
      // Non-not-found error
      throw existingErr;
    }

    if (existingRow) {
      const row = existingRow as VpatRowDraft;
      const hasContent = Boolean((row.conformance && String(row.conformance).length > 0) || (row.remarks && row.remarks.length > 0));
      if (hasContent) {
        return NextResponse.json({ status: "SKIPPED", row, warning: suggestion.warning } satisfies GenerateResponse, { status: 200 });
      }
    }

    const nowIso = new Date().toISOString();

    // Try UPDATE where empty (both fields null)
    const updatePayload = {
      conformance: suggestion.conformance,
      remarks: suggestion.remarks,
      related_issue_ids: suggestion.related_issue_ids,
      related_issue_urls: suggestion.related_issue_urls,
      last_generated_at: nowIso,
      last_edited_by: user.id as UUID,
    } as const;

    const { data: afterUpdate, error: updateErr } = await supabase
      .from("vpat_row_draft")
      .update(updatePayload)
      .eq("vpat_id", vpatId)
      .eq("wcag_criterion_id", criterionId)
      .is("conformance", null)
      .is("remarks", null)
      .select("*")
      .single();

    if (!updateErr && afterUpdate) {
      return NextResponse.json({ status: "UPDATED", row: afterUpdate as VpatRowDraft, warning: suggestion.warning } satisfies GenerateResponse);
    }

    // If no update occurred (either no row or guarded), attempt INSERT with ON CONFLICT DO NOTHING
    const insertRow = {
      vpat_id: vpatId,
      wcag_criterion_id: criterionId,
      ...updatePayload,
    } as const;

    const { error: insertErr } = await supabase
      .from("vpat_row_draft")
      .upsert([insertRow], { onConflict: "vpat_id,wcag_criterion_id", ignoreDuplicates: true });

    if (insertErr) throw insertErr;

    // Fetch current row to determine final status
    const { data: finalRow } = await supabase
      .from("vpat_row_draft")
      .select("*")
      .eq("vpat_id", vpatId)
      .eq("wcag_criterion_id", criterionId)
      .single();

    // If there was no existingRow before, we consider this an INSERTED; otherwise UPDATED due to filling blanks.
    const finalStatus: GenerateResponse["status"] = existingRow ? "UPDATED" : "INSERTED";
    return NextResponse.json({ status: finalStatus, row: (finalRow as VpatRowDraft) ?? null, warning: suggestion.warning } satisfies GenerateResponse);
  } catch (error) {
    console.error("Error generating VPAT row:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
