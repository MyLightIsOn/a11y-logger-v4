import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "@/types/common";
import type { VpatVersion } from "@/types/vpat";

/**
 * GET /api/vpat_versions/[versionId]
 * Returns a single VPAT version by id. 204 No Content if none.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { versionId: UUID } },
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

    const versionId = params.versionId as UUID;

    const { data, error } = await supabase
      .from("vpat_version")
      .select("*")
      .eq("id", versionId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json(data as VpatVersion, { status: 200 });
  } catch (error) {
    console.error("Error fetching VPAT version:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
