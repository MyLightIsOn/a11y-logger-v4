import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "@/types/common";
import type { Vpat, UpdateVpatRequest } from "@/types/vpat";

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
