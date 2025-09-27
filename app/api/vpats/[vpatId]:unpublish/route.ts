import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "@/types/common";

/**
 * POST /api/vpats/[vpatId]:unpublish
 * Sets VPAT status back to 'draft' and clears current_version_id.
 */
export async function POST(
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

    const { vpatId: rawVpatId } = await ctx.params;
    const vpatId = (rawVpatId as string).split(":")[0] as UUID;

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
  } catch (error) {
    console.error("Error unpublishing VPAT:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS",
    },
  });
}
