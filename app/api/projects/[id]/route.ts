import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { Tag } from "@/types/tag";
import type { Assessment } from "@/types/assessment";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch single project for the current user with tags and related assessments
    const { data, error } = await supabase
      .from("projects")
      .select(
        `
        *,
        projects_tags(
          tags(*)
        ),
        projects_assessments(
          assessments(*)
        )
      `
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    type ProjectRowWithJoins = {
      projects_tags?: { tags: Tag }[];
      projects_assessments?: { assessments: Assessment }[];
      [key: string]: unknown;
    };

    const row = data as ProjectRowWithJoins | null;
    const transformed = row
      ? {
          ...row,
          tags:
            row.projects_tags?.map((pt: { tags: Tag }) => pt.tags) || [],
          assessments:
            row.projects_assessments?.map(
              (pa: { assessments: Assessment }) => pa.assessments
            ) || [],
        }
      : null;

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Ensure project exists and belongs to user
    const { data: current, error: fetchErr } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !current) {
      if (fetchErr?.code === "PGRST116") {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }
      throw fetchErr;
    }

    const body = await request.json();

    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const description =
      typeof body?.description === "string" ? body.description.trim() : undefined;

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof name !== "undefined") updatePayload.name = name;
    if (typeof description !== "undefined") updatePayload.description = description;

    const { data, error } = await supabase
      .from("projects")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    // Handle tag updates if tag_ids is provided
    const tag_ids_raw = Array.isArray(body?.tag_ids) ? body.tag_ids : undefined;
    if (tag_ids_raw) {
      const newTagIds: string[] = tag_ids_raw
        .map((t: unknown) => (typeof t === "string" ? t : undefined))
        .filter((t: string | undefined): t is string => Boolean(t));

      try {
        const { data: existingRows, error: existingErr } = await supabase
          .from("projects_tags")
          .select("tag_id")
          .eq("project_id", id);
        if (existingErr) throw existingErr;

        const existingTagIds = new Set(
          (existingRows || []).map((r: { tag_id: string }) => r.tag_id)
        );
        const newSet = new Set(newTagIds);

        const toInsert: string[] = [...newSet].filter(
          (tid) => !existingTagIds.has(tid)
        );
        const toDelete: string[] = [...existingTagIds].filter(
          (tid) => !newSet.has(tid)
        );

        if (toDelete.length > 0) {
          const { error: delErr } = await supabase
            .from("projects_tags")
            .delete()
            .eq("project_id", id)
            .in("tag_id", toDelete);
          if (delErr) {
            console.error("Failed to delete project tags:", delErr);
          }
        }

        if (toInsert.length > 0) {
          const joinRows = toInsert.map((tag_id) => ({ project_id: id, tag_id }));
          const { error: insErr } = await supabase
            .from("projects_tags")
            .insert(joinRows);
          if (insErr) {
            console.error("Failed to insert project tags:", insErr);
          }
        }
      } catch (e) {
        console.error("Error updating project tags:", e);
      }
    }

    // Handle assessment updates if assessment_ids is provided
    const assessment_ids_raw = Array.isArray(body?.assessment_ids)
      ? body.assessment_ids
      : undefined;
    if (assessment_ids_raw) {
      const newAssessmentIds: string[] = assessment_ids_raw
        .map((a: unknown) => (typeof a === "string" ? a : undefined))
        .filter((a: string | undefined): a is string => Boolean(a));

      try {
        const { data: existingRows, error: existingErr } = await supabase
          .from("projects_assessments")
          .select("assessment_id")
          .eq("project_id", id);
        if (existingErr) throw existingErr;

        const existingIds = new Set(
          (existingRows || []).map((r: { assessment_id: string }) => r.assessment_id)
        );
        const newSet = new Set(newAssessmentIds);

        const toInsert: string[] = [...newSet].filter((aid) => !existingIds.has(aid));
        const toDelete: string[] = [...existingIds].filter((aid) => !newSet.has(aid));

        if (toDelete.length > 0) {
          const { error: delErr } = await supabase
            .from("projects_assessments")
            .delete()
            .eq("project_id", id)
            .in("assessment_id", toDelete);
          if (delErr) {
            console.error("Failed to delete project assessments:", delErr);
          }
        }

        if (toInsert.length > 0) {
          const joinRows = toInsert.map((assessment_id) => ({
            project_id: id,
            assessment_id,
          }));
          const { error: insErr } = await supabase
            .from("projects_assessments")
            .insert(joinRows);
          if (insErr) {
            console.error("Failed to insert project assessments:", insErr);
          }
        }
      } catch (e) {
        console.error("Error updating project assessments:", e);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Ensure project exists and belongs to user
    const { data: row, error: rowErr } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (rowErr || !row || (row as { user_id?: string }).user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete join table rows first
    await supabase.from("projects_tags").delete().eq("project_id", id);
    await supabase.from("projects_assessments").delete().eq("project_id", id);

    const { error: delErr } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);
    if (delErr) {
      console.error("Error deleting project:", delErr);
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unhandled error in DELETE /api/projects/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
