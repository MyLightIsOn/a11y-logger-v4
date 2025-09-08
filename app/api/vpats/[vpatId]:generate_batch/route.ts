import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "@/types/common";
import type { VpatRowDraft } from "@/types/vpat";

// Event payload types
import type { BatchStartEvent, BatchRowEvent, BatchSkipEvent, BatchErrorEvent, BatchDoneEvent } from "@/types/vpat-batch";

function sseLine(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

// We reuse the same logic as single-row generation by calling its core flow inline.
// To avoid duplicating logic, we keep the same DB queries, guards, and heuristics inside this handler loop.

export async function POST(request: NextRequest, { params }: { params: { vpatId: UUID } }) {
  const supabase = await createClient();

  // Auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const vpatId = params.vpatId as UUID;

  // Parse body
  let body: { criterionIds?: UUID[] } = {};
  try {
    body = (await request.json()) as { criterionIds?: UUID[] };
  } catch {
    // ignore, will validate below
  }
  const criterionIds = Array.isArray(body.criterionIds) ? body.criterionIds : [];

  // Setup SSE stream
  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      const encoder = new TextEncoder();
      // Send start event
      controller.enqueue(encoder.encode(sseLine({ type: "start", vpatId, total: criterionIds.length } satisfies BatchStartEvent)));

      try {
        // Resolve VPAT and project id (and ensure accessible via RLS)
        const { data: vpatRow, error: vpatErr } = await supabase
          .from("vpat")
          .select("id, project_id")
          .eq("id", vpatId)
          .single();
        if (vpatErr || !vpatRow) {
          controller.enqueue(encoder.encode(sseLine({ type: "error", message: "VPAT not found" } satisfies BatchErrorEvent)));
          controller.enqueue(encoder.encode(sseLine({ type: "done" } satisfies BatchDoneEvent)));
          controller.close();
          return;
        }
        const projectId = (vpatRow as { project_id: UUID }).project_id;

        // Pre-fetch assessment IDs for this project (reused for each criterion like single-row)
        const { data: paRows, error: paErr } = await supabase
          .from("projects_assessments")
          .select("assessment_id")
          .eq("project_id", projectId);
        if (paErr) throw paErr;

        const assessmentIds = Array.from(
          new Set(((paRows || []) as { assessment_id: string }[]).map((r) => r.assessment_id).filter((id): id is string => typeof id === "string" && id.length > 0)),
        );

        // For each criterion, we mirror the single-row route logic
        for (const criterionId of criterionIds) {
          try {
            // Resolve WCAG code
            const { data: wcagRow, error: wcagErr } = await supabase
              .from("wcag_criteria")
              .select("id, code")
              .eq("id", criterionId)
              .single();
            if (wcagErr || !wcagRow) {
              controller.enqueue(encoder.encode(sseLine({ type: "error", criterionId, message: "WCAG criterion not found" } satisfies BatchErrorEvent)));
              continue;
            }
            const criterionCode = (wcagRow as { code: string }).code;

            // Fetch issues if we have assessments
            let issues: import("@/types/issue").IssueRead[] = [];
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

              type IssueRowWithJoin = import("@/types/issue").IssueRead & {
                issues_tags?: { tags: unknown }[];
                issue_criteria_agg?: Array<{ criteria_codes?: string[]; criteria?: unknown[] }>;
              };

              const mapped: import("@/types/issue").IssueRead[] = ((issueRows as unknown as IssueRowWithJoin[] | null) || []).map((row) => {
                const { issue_criteria_agg, issues_tags: _omitTags, ...rest } = row;
                void _omitTags;
                const out: import("@/types/issue").IssueRead = { ...(rest as import("@/types/issue").IssueRead) };
                if (issue_criteria_agg?.[0]) {
                  const agg = issue_criteria_agg[0];
                  out.criteria_codes = Array.isArray(agg.criteria_codes) ? agg.criteria_codes : [];
                  out.criteria = Array.isArray(agg.criteria) ? (agg.criteria as import("@/types/issue").IssueRead["criteria"]) : [];
                }
                return out;
              });
              issues = mapped;
            }

            // Use same generation helper
            const { generateForCriterion } = await import("@/lib/vpat/generation");
            const suggestion = generateForCriterion({ projectId, criterionCode, issues });

            // No-overwrite guard: if an existing row has content, skip
            const { data: existingRow, error: existingErr } = await supabase
              .from("vpat_row_draft")
              .select("*")
              .eq("vpat_id", vpatId)
              .eq("wcag_criterion_id", criterionId)
              .single();
            if (existingErr && (existingErr as { code?: string }).code !== "PGRST116") {
              throw existingErr as Error;
            }
            if (existingRow) {
              const row = existingRow as VpatRowDraft;
              const hasContent = Boolean((row.conformance && String(row.conformance).length > 0) || (row.remarks && row.remarks.length > 0));
              if (hasContent) {
                controller.enqueue(
                  encoder.encode(
                    sseLine({ type: "skip", criterionId, row, warning: suggestion.warning } satisfies BatchSkipEvent),
                  ),
                );
                continue;
              }
            }

            const nowIso = new Date().toISOString();
            const updatePayload = {
              conformance: suggestion.conformance,
              remarks: suggestion.remarks,
              related_issue_ids: suggestion.related_issue_ids,
              related_issue_urls: suggestion.related_issue_urls,
              last_generated_at: nowIso,
              last_edited_by: user.id as UUID,
            } as const;

            // Try UPDATE where empty
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
              controller.enqueue(
                encoder.encode(
                  sseLine({ type: "row", criterionId, status: "UPDATED", row: afterUpdate as VpatRowDraft, warning: suggestion.warning } satisfies BatchRowEvent),
                ),
              );
              continue;
            }

            // If no update occurred, attempt upsert (insert if missing)
            const insertRow = {
              vpat_id: vpatId,
              wcag_criterion_id: criterionId,
              ...updatePayload,
            } as const;

            const { error: insertErr } = await supabase
              .from("vpat_row_draft")
              .upsert([insertRow], { onConflict: "vpat_id,wcag_criterion_id", ignoreDuplicates: true });
            if (insertErr) throw insertErr;

            const { data: finalRow } = await supabase
              .from("vpat_row_draft")
              .select("*")
              .eq("vpat_id", vpatId)
              .eq("wcag_criterion_id", criterionId)
              .single();

            const status: "UPDATED" | "INSERTED" = existingRow ? "UPDATED" : "INSERTED";
            controller.enqueue(
              encoder.encode(
                sseLine({ type: "row", criterionId, status, row: (finalRow as VpatRowDraft) ?? null, warning: suggestion.warning } satisfies BatchRowEvent),
              ),
            );
          } catch (err) {
            controller.enqueue(
              encoder.encode(
                sseLine({ type: "error", criterionId: (criterionId as UUID), message: (err as Error)?.message || "Internal error" } satisfies BatchErrorEvent),
              ),
            );
          }
        }

        controller.enqueue(encoder.encode(sseLine({ type: "done" } satisfies BatchDoneEvent)));
        controller.close();
      } catch (e) {
        controller.enqueue(encoder.encode(sseLine({ type: "error", message: (e as Error)?.message || "Internal error" } satisfies BatchErrorEvent)));
        controller.enqueue(encoder.encode(sseLine({ type: "done" } satisfies BatchDoneEvent)));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // for some proxies
    },
  });
}
