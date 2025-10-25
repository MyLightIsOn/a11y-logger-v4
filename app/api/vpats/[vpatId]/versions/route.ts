import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "@/types/common";
import type { VpatVersion } from "@/types/vpat";

/**
 * GET /api/vpats/[vpatId]/versions
 * Returns published versions for a VPAT (may be empty).
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
      .from("vpat_version")
      .select("*")
      .eq("vpat_id", vpatId)
      .order("version_number", { ascending: false });

    if (error) throw error;

    const versions = (data || []) as VpatVersion[];

    return NextResponse.json(versions, { status: 200 });
  } catch (error) {
    console.error("Error fetching VPAT versions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
