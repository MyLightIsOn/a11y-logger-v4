import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "@/types/common";
import type { VpatRowDraft } from "@/types/vpat";

/**
 * GET /api/vpats/[vpatId]/rows
 * Returns all draft rows for a VPAT. Returns [] when none.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { vpatId: UUID } },
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

    const vpatId = params.vpatId as UUID;

    const { data, error } = await supabase
      .from("vpat_row_draft")
      .select("*")
      .eq("vpat_id", vpatId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const rows = (data || []) as VpatRowDraft[];

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching VPAT rows:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
