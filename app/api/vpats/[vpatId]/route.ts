import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "@/types/common";
import type {
  Vpat,
  UpdateVpatRequest,
  ConformanceValue,
  VpatVersion,
} from "@/types/vpat";
import { WcagScope, CriteriaRow } from "@/lib/vpat/export";
import { computeProjectMetrics } from "@/lib/metrics/project";

/**
 * GET /api/vpats/[vpatId]
 * Returns a single VPAT row by id.
 */
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ vpatId: UUID }> },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { vpatId } = await ctx.params;

    const { data, error } = await supabase
      .from("vpat")
      .select("*")
      .eq("id", vpatId)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(data as Vpat, { status: 200 });
  } catch (error) {
    console.error("Error fetching VPAT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/vpats/[vpatId]
 * Update title/description of a draft VPAT. Status must remain 'draft'.
 */
export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ vpatId: UUID }> },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { vpatId } = await ctx.params;

    // First ensure the VPAT exists and is draft
    const { data: existing, error: fetchErr } = await supabase
      .from("vpat")
      .select("id,status")
      .eq("id", vpatId)
      .single();

    if (fetchErr) throw fetchErr;
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft VPATs can be updated" },
        { status: 400 },
      );
    }

    const body: UpdateVpatRequest = await request.json();

    const patch: { title?: string; description?: string | null } = {};
    if (typeof body.title === "string") {
      const t = body.title.trim();
      if (t.length === 0) {
        return NextResponse.json(
          { error: "title cannot be empty" },
          { status: 400 },
        );
      }
      patch.title = t;
    }
    if (body.hasOwnProperty("description")) {
      // allow empty string -> empty string, and explicit null to clear
      patch.description = body.description ?? null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "No updatable fields provided" },
        { status: 400 },
      );
    }

    // Perform update; ensure status remains draft by not modifying it
    const { data, error } = await supabase
      .from("vpat")
      .update(patch)
      .eq("id", vpatId)
      .eq("status", "draft") // safeguard at DB level
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json(data as Vpat, { status: 200 });
  } catch (error) {
    console.error("Error updating VPAT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, PUT, POST, OPTIONS",
    },
  });
}

/**
 * POST /api/vpats/[vpatId] with suffix support
 * - If vpatId contains ":publish" → publish current draft
 * - If vpatId contains ":unpublish" → unpublish back to draft
 */
export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ vpatId: UUID }> },
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

    const { vpatId: raw } = await ctx.params;
    const rawStr = String(raw);

    if (rawStr.includes(":publish")) {
      const vpatId = rawStr.split(":")[0] as UUID;

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

      type WcagRow = {
        id: UUID;
        code: string;
        name: string;
        level: "A" | "AA" | "AAA";
      };

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

      const wcag_scope: WcagScope = {
        versions: ["2.0", "2.1", "2.2"],
        levels: { A: true, AA: true, AAA: true },
      };

      const criteria_rows: CriteriaRow[] = ((criteriaRows || []) as WcagRow[])
        .map((c) => {
          const draft = byCriterionId.get(c.id);
          const conformance: ConformanceValue =
            (draft?.conformance as ConformanceValue | null) ?? "Not Evaluated";
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
      if (insErr || !inserted)
        throw insErr || new Error("Failed to insert version");

      const newVersionId = (
        inserted as Pick<VpatVersion, "id"> & {
          version_number: number;
          published_at: string;
        }
      ).id as UUID;

      // Update vpat.current_version_id and status
      const { error: updErr } = await supabase
        .from("vpat")
        .update({ current_version_id: newVersionId, status: "published" })
        .eq("id", vpatId);
      if (updErr) throw updErr;

      // Compute and store project metrics snapshot (best-effort)
      let metrics: Awaited<ReturnType<typeof computeProjectMetrics>> | null =
        null;
      try {
        metrics = await computeProjectMetrics(projectId);
      } catch (e) {
        console.warn("Failed to compute project metrics on publish:", e);
      }
      if (metrics) {
        try {
          const notes = { vpat_version_id: newVersionId } as const;
          const { error: pamErr } = await supabase
            .from("project_accessibility_metrics")
            .insert([
              {
                project_id: projectId,
                counts_by_severity: metrics.countsBySeverity,
                counts_by_wcag_level: metrics.countsByWcagLevel,
                open_vs_resolved: metrics.openVsResolved,
                notes,
              },
            ]);
          if (pamErr) {
            console.warn(
              "Failed to insert project_accessibility_metrics snapshot:",
              pamErr,
            );
          }
        } catch (e) {
          console.warn(
            "Unexpected error inserting project_accessibility_metrics snapshot:",
            e,
          );
        }
      }

      return NextResponse.json({
        version_id: newVersionId,
        version_number: (inserted as { version_number: number }).version_number,
        published_at: (inserted as { published_at: string }).published_at,
        wcag_scope,
        criteria_rows_count: criteria_rows.length,
        metrics,
      });
    }

    if (rawStr.includes(":unpublish")) {
      const vpatId = rawStr.split(":")[0] as UUID;

      // Ensure VPAT exists
      const { data: vpatRow, error: vpatErr } = await supabase
        .from("vpat")
        .select("id,status")
        .eq("id", vpatId)
        .single();

      if (vpatErr) throw vpatErr;
      if (!vpatRow) {
        return NextResponse.json({ error: "VPAT not found" }, { status: 404 });
      }

      // Update to draft and clear current_version_id
      const { data, error } = await supabase
        .from("vpat")
        .update({ status: "draft", current_version_id: null })
        .eq("id", vpatId)
        .select("*")
        .single();

      if (error) throw error;

      return NextResponse.json(data, { status: 200 });
    }

    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Error handling POST for VPAT route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
