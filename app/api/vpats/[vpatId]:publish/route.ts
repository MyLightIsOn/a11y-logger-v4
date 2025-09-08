import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "@/types/common";
import type { ConformanceValue, VpatVersion } from "@/types/vpat";
import type { CriteriaRow, WcagScope } from "@/lib/vpat/export";
import { computeProjectMetrics } from "@/lib/metrics/project";

/**
 * POST /api/vpats/[vpatId]:publish
 * Creates an immutable VPAT version by snapshotting wcag scope and criteria rows.
 * Returns { version_id, version_number, published_at } on success.
 */
export async function POST(_request: NextRequest, { params }: { params: { vpatId: UUID } }) {
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

    const vpatId = params.vpatId as UUID;

    // Ensure VPAT exists and fetch its project for RLS scoping
    const { data: vpatRow, error: vpatErr } = await supabase
      .from("vpat")
      .select("id, project_id")
      .eq("id", vpatId)
      .single();
    if (vpatErr || !vpatRow) {
      return NextResponse.json({ error: "VPAT not found" }, { status: 404 });
    }
    const projectId = (vpatRow as { project_id: UUID }).project_id;

    // Fetch all WCAG criteria (A/AA/AAA)
    const { data: criteriaRows, error: critErr } = await supabase
      .from("wcag_criteria")
      .select("id, code, name, level");
    if (critErr) throw critErr;

    type WcagRow = { id: UUID; code: string; name: string; level: "A" | "AA" | "AAA" };

    // Fetch all draft rows for the VPAT
    const { data: draftRows, error: draftErr } = await supabase
      .from("vpat_row_draft")
      .select("wcag_criterion_id, conformance, remarks, related_issue_urls")
      .eq("vpat_id", vpatId);
    if (draftErr) throw draftErr;

    type DraftRow = {
      wcag_criterion_id: UUID;
      conformance: ConformanceValue | null;
      remarks: string | null;
      related_issue_urls: string[] | null;
    };

    const byCriterionId = new Map<UUID, DraftRow>();
    for (const r of (draftRows || []) as DraftRow[]) {
      byCriterionId.set(r.wcag_criterion_id, r);
    }

    // Determine wcag_scope based on project assessments (MVP heuristic):
    // - versions: include highest version 2.2 only (placeholder until assessment-derived scope is wired)
    // - levels: include A/AA/AAA
    const wcag_scope: WcagScope = {
      versions: ["2.0", "2.1", "2.2"],
      levels: { A: true, AA: true, AAA: true },
    };

    // Build criteria_rows snapshot by joining criteria reference with draft rows
    const criteria_rows: CriteriaRow[] = ((criteriaRows || []) as WcagRow[])
      .map((c) => {
        const draft = byCriterionId.get(c.id);
        const conformance: ConformanceValue = (draft?.conformance as ConformanceValue | null) ?? "Not Evaluated";
        const remarks: string | null = draft?.remarks ?? null;
        const issues = Array.isArray(draft?.related_issue_urls)
          ? draft!.related_issue_urls!.map((url) => ({ url }))
          : null;
        const row: CriteriaRow = {
          code: c.code,
          name: c.name,
          level: c.level,
          conformance,
          remarks,
          issues,
        };
        return row;
      })
      // Keep deterministic ordering by code (client-side consumers and MD exporter expect numeric order)
      .sort((a, b) => {
        const toNum = (code: string): [number, number, number] => {
          const parts = code.split(".").map((s) => Number.parseInt(s, 10));
          return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
        };
        const A = toNum(a.code);
        const B = toNum(b.code);
        if (A[0] !== B[0]) return A[0] - B[0];
        if (A[1] !== B[1]) return A[1] - B[1];
        if (A[2] !== B[2]) return A[2] - B[2];
        return a.code.localeCompare(b.code);
      });

    // Compute next version number
    const { data: latestVersion, error: verErr } = await supabase
      .from("vpat_version")
      .select("version_number")
      .eq("vpat_id", vpatId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (verErr && verErr.code !== "PGRST116") throw verErr;

    const nextNumber = (latestVersion?.version_number ?? 0) + 1;

    // Insert new version snapshot
    const { data: inserted, error: insErr } = await supabase
      .from("vpat_version")
      .insert([
        {
          vpat_id: vpatId,
          version_number: nextNumber,
          published_by: user.id,
          wcag_scope,
          criteria_rows,
        },
      ])
      .select("id, version_number, published_at")
      .single();
    if (insErr || !inserted) throw insErr || new Error("Failed to insert version");

    const newVersionId = (inserted as Pick<VpatVersion, "id"> & { version_number: number; published_at: string }).id as UUID;

    // Update vpat.current_version_id and status
    const { error: updErr } = await supabase
      .from("vpat")
      .update({ current_version_id: newVersionId, status: "published" })
      .eq("id", vpatId);
    if (updErr) throw updErr;

    // Compute project metrics snapshot (Milestone 7 - step 31)
    let metrics: Awaited<ReturnType<typeof computeProjectMetrics>> | null = null;
    try {
      metrics = await computeProjectMetrics(projectId);
    } catch (e) {
      console.warn("Failed to compute project metrics on publish:", e);
    }

    return NextResponse.json({
      version_id: newVersionId,
      version_number: (inserted as { version_number: number }).version_number,
      published_at: (inserted as { published_at: string }).published_at,
      wcag_scope,
      criteria_rows_count: criteria_rows.length,
      metrics,
    });
  } catch (error) {
    console.error("Error publishing VPAT:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
