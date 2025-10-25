import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "@/types/common";
import type { Vpat, VpatCurrentView, VpatListResponse } from "@/types/vpat";

interface CreateVpatBody {
  projectId: UUID;
  title: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreateVpatBody = await request.json();
    const projectId = body?.projectId;
    const title = body?.title?.trim();
    const description = body?.description ?? null;

    if (!projectId || !title) {
      return NextResponse.json(
        { error: "projectId and title are required" },
        { status: 400 },
      );
    }

    // Insert draft VPAT
    const { data, error } = await supabase
      .from("vpat")
      .insert({
        project_id: projectId,
        title,
        description,
        status: "draft",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data as Vpat, { status: 201 });
  } catch (error) {
    console.error("Error creating VPAT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query from the current view for list cards
    const { data, error } = await supabase.from("v_vpat_current").select("*");

    if (error) throw error;

    const rows = (data || []) as VpatCurrentView[];
    const response: VpatListResponse = {
      data: rows,
      count: rows.length,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error listing VPATs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
