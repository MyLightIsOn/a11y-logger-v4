import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "@/types/common";
import type { ValidateVpatResponse, VpatRowDraft } from "@/types/vpat";

/**
 * POST /api/vpats/[vpatId]:validate
 * Runs server-side validations for the VPAT draft rows.
 * - Not Applicable requires remarks
 * - If conformance != Supports, remarks required (including Not Evaluated)
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

    const { vpatId: rawVpatId } = await ctx.params;
    const vpatId = (rawVpatId as string).split(":")[0] as UUID;

    // Ensure VPAT exists (RLS will scope access by project)
    const { data: vpatRow, error: vpatErr } = await supabase
      .from("vpat")
      .select("id")
      .eq("id", vpatId)
      .maybeSingle();
    if (vpatErr) throw vpatErr;
    if (!vpatRow) {
      return NextResponse.json({ error: "VPAT not found" }, { status: 404 });
    }

    // Fetch all draft rows for this VPAT
    const { data: draftRows, error: rowsErr } = await supabase
      .from("vpat_row_draft")
      .select("*")
      .eq("vpat_id", vpatId);
    if (rowsErr) throw rowsErr;

    const issues: ValidateVpatResponse["issues"] = [];

    const rows = (draftRows || []) as VpatRowDraft[];
    for (const r of rows) {
      const criterionId = r.wcag_criterion_id as UUID;
      const conf = r.conformance ?? null;
      const remarks = (r.remarks || "").trim();

      if (conf === "Not Applicable" && remarks.length === 0) {
        issues.push({ criterionId, message: "Remarks are required when conformance is Not Applicable.", field: "remarks" });
      }
      if (conf !== null && conf !== "Supports" && remarks.length === 0) {
        issues.push({ criterionId, message: "Remarks are required unless conformance is Supports.", field: "remarks" });
      }
    }

    const resp: ValidateVpatResponse = {
      ok: issues.length === 0,
      issues,
    };

    return NextResponse.json(resp, { status: 200 });
  } catch (error) {
    console.error("Error validating VPAT:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
