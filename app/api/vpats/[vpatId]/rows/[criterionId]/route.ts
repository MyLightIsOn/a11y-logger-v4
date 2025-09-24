import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "@/types/common";
import type { SaveVpatRowRequest, VpatRowDraft } from "@/types/vpat";

/**
 * PUT /api/vpats/[vpatId]/rows/[criterionId]
 * Upsert a VPAT draft row identified by (vpat_id, wcag_criterion_id).
 * Body: { conformance|null, remarks|null, related_issue_ids?, related_issue_urls? }
 */
export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ vpatId: UUID; criterionId: UUID }> },
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

    const { vpatId: rawVpatId, criterionId: rawCriterionId } = await ctx.params;
    const vpatId = (rawVpatId as string).split(":")[0] as UUID;
    let criterionId = (rawCriterionId as string).split(":")[0] as UUID;

    // Ensure VPAT exists and is accessible (RLS will also enforce)
    const { data: vpatCheck, error: vpatErr } = await supabase
      .from("vpat")
      .select("id,status")
      .eq("id", vpatId)
      .single();

    // If client passed the draft row id by mistake, translate it to wcag_criterion_id
    if (vpatCheck) {
      const { data: draftById, error: draftByIdErr } = await supabase
        .from("vpat_row_draft")
        .select("id,wcag_criterion_id")
        .eq("id", criterionId)
        .eq("vpat_id", vpatId)
        .maybeSingle();
      if (!draftByIdErr && draftById && draftById.wcag_criterion_id) {
        criterionId = (draftById as { wcag_criterion_id: UUID })
          .wcag_criterion_id as UUID;
      }
    }

    if (vpatErr) throw vpatErr;
    if (!vpatCheck) {
      return NextResponse.json({ error: "VPAT not found" }, { status: 404 });
    }

    // Parse body
    const body: SaveVpatRowRequest = await request.json();

    // Normalize optional arrays to either array or null (undefined -> null keeps value cleared on upsert)
    const payload = {
      vpat_id: vpatId,
      wcag_criterion_id: criterionId,
      conformance: body.conformance ?? null,
      remarks: body.remarks ?? null,
      related_issue_ids:
        typeof body.related_issue_ids === "undefined"
          ? null
          : body.related_issue_ids,
      related_issue_urls:
        typeof body.related_issue_urls === "undefined"
          ? null
          : body.related_issue_urls,
      last_edited_by: user.id as UUID,
    } as const;

    // Upsert by composite key (vpat_id, wcag_criterion_id)
    const { error: upsertError } = await supabase
      .from("vpat_row_draft")
      .upsert(payload, { onConflict: "vpat_id,wcag_criterion_id" });

    if (upsertError) throw upsertError;

    // Fetch the updated/created row explicitly to return a single record
    const { data, error } = await supabase
      .from("vpat_row_draft")
      .select("*")
      .eq("vpat_id", vpatId)
      .eq("wcag_criterion_id", criterionId)
      .single();

    if (error) throw error;

    return NextResponse.json(data as VpatRowDraft, { status: 200 });
  } catch (error) {
    console.error("Error saving VPAT row:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Handle CORS preflight or generic OPTIONS for this route
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "PUT, POST, OPTIONS",
    },
  });
}

// Support POST as an alternative to PUT for clients/environments that disallow PUT
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ vpatId: UUID; criterionId: UUID }> },
) {
  return PUT(request, ctx);
}
