import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { wcagVersionEnum } from "@/lib/validation/issues";
import type { Tag } from "@/types/tag";
import type { Assessment } from "@/types/assessment";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
      .select(
        `
        *,
        assessments_tags(
          tags(*)
        )
      `,
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Assessment not found" },
          { status: 404 },
        );
      }
      throw error;
    }

    type AssessmentRowWithJoin = Assessment & {
      assessments_tags?: { tags: Tag }[];
    };
    const row = data as AssessmentRowWithJoin | null;
    const transformed = row
      ? {
          ...row,
          tags: row.assessments_tags?.map((at: { tags: Tag }) => at.tags) || [],
        }
      : null;

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
      if (fetchErr?.code === "PGRST116") {
        return NextResponse.json(
          { error: "Assessment not found" },
          { status: 404 },
        );
      }
      throw fetchErr;
    }

    const body = await request.json();

    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const description =
      typeof body?.description === "string"
        ? body.description.trim()
        : undefined;
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

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof name !== "undefined") updatePayload.name = name;
    if (typeof description !== "undefined")
      updatePayload.description = description;
    if (typeof requestedWcagVersion !== "undefined")
      updatePayload.wcag_version = requestedWcagVersion;

    const { data, error } = await supabase
      .from("assessments")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Assessment not found" },
          { status: 404 },
        );
      }
      throw error;
    }

    // Handle tag updates if tag_ids is provided in payload
    const tag_ids_raw = Array.isArray(body?.tag_ids) ? body.tag_ids : undefined;
    if (tag_ids_raw) {
      // Normalize to string IDs and filter out invalid entries
      const newTagIds: string[] = tag_ids_raw
        .map((t: unknown) => (typeof t === "string" ? t : undefined))
        .filter((t: string | undefined): t is string => Boolean(t));

      try {
        // Fetch current tag ids for this assessment
        const { data: existingRows, error: existingErr } = await supabase
          .from("assessments_tags")
          .select("tag_id")
          .eq("assessment_id", id);
        if (existingErr) throw existingErr;

        const existingTagIds = new Set(
          (existingRows || []).map((r: { tag_id: string }) => r.tag_id),
        );
        const newSet = new Set(newTagIds);

        // Determine which to insert and which to delete
        const toInsert: string[] = [...newSet].filter(
          (tid) => !existingTagIds.has(tid),
        );
        const toDelete: string[] = [...existingTagIds].filter(
          (tid) => !newSet.has(tid),
        );

        if (toDelete.length > 0) {
          const { error: delErr } = await supabase
            .from("assessments_tags")
            .delete()
            .eq("assessment_id", id)
            .in("tag_id", toDelete);
          if (delErr) {
            console.error("Failed to delete assessment tags:", delErr);
          }
        }

        if (toInsert.length > 0) {
          const joinRows = toInsert.map((tag_id) => ({
            assessment_id: id,
            tag_id,
          }));
          const { error: insErr } = await supabase
            .from("assessments_tags")
            .insert(joinRows);
          if (insErr) {
            console.error("Failed to insert assessment tags:", insErr);
          }
        }
      } catch (e) {
        // Non-fatal: log the error but still return the updated assessment row
        console.error("Error updating assessment tags:", e);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Missing assessment id" },
        { status: 400 },
      );
    }

    // Ensure assessment belongs to user
    const { data: row, error: rowErr } = await supabase
      .from("assessments")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (rowErr || !row || (row as { user_id?: string }).user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete join table rows first
    await supabase.from("assessments_tags").delete().eq("assessment_id", id);
    await supabase.from("assessments_issues").delete().eq("assessment_id", id);

    const { error: delErr } = await supabase
      .from("assessments")
      .delete()
      .eq("id", id);
    if (delErr) {
      console.error("Error deleting assessment:", delErr);
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unhandled error in DELETE /api/assessments/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
