import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { wcagVersionEnum } from "@/lib/validation/issues";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    const { data, error } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      if ((error as any).code === "PGRST116") {
        return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching assessment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    // Fetch current assessment to compare versions and confirm ownership
    const { data: current, error: fetchErr } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !current) {
      if ((fetchErr as any)?.code === "PGRST116") {
        return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
      }
      throw fetchErr;
    }

    const body = await request.json();

    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const description = typeof body?.description === "string" ? body.description.trim() : undefined;
    const wcag_version_raw = body?.wcag_version;

    // Determine if wcag_version change is requested
    let requestedWcagVersion: string | undefined;
    if (typeof wcag_version_raw !== "undefined") {
      try {
        requestedWcagVersion = wcagVersionEnum.parse(wcag_version_raw);
      } catch {
        return NextResponse.json(
          { error: "wcag_version must be one of '2.0' | '2.1' | '2.2'" },
          { status: 400 },
        );
      }
    }

    // If version change is requested and different from current, enforce lock when issues exist
    if (requestedWcagVersion && requestedWcagVersion !== current.wcag_version) {
      const { count, error: countErr } = await supabase
        .from("assessments_issues")
        .select("issue_id", { count: "exact", head: true })
        .eq("assessment_id", id);

      if (countErr) throw countErr;

      if ((count || 0) > 0) {
        return NextResponse.json(
          {
            error:
              "Assessment WCAG version is locked once Issues exist. Create a new Assessment to change version.",
          },
          { status: 400 },
        );
      }
    }

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof name !== "undefined") updatePayload.name = name;
    if (typeof description !== "undefined") updatePayload.description = description;
    if (typeof requestedWcagVersion !== "undefined") updatePayload.wcag_version = requestedWcagVersion;

    const { data, error } = await supabase
      .from("assessments")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      if ((error as any).code === "PGRST116") {
        return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating assessment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
