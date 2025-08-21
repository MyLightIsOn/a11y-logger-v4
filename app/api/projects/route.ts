import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") === "asc";

    // Fetch projects for the current user with tags
    const { data, error } = await supabase
      .from("projects")
      .select(
        `
        *,
        projects_tags(
          tags(*)
        )
      `,
      )
      .eq("user_id", user.id)
      .order(sortBy, { ascending: sortOrder });

    if (error) {
      throw error;
    }

    // Transform the data to flatten the tags structure
    const transformedData =
      data?.map((project) => ({
        ...project,
        tags:
          project.projects_tags?.map(
            (pt: { tags: import("@/types/tag").Tag }) => pt.tags,
          ) || [],
      })) || [];

    return NextResponse.json({
      data: transformedData,
      count: transformedData?.length || 0,
      totalPages: 1,
      currentPage: 1,
      hasNext: false,
      hasPrev: false,
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { name, description } = body || {};

    if (!name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 },
      );
    }

    // Create new project
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name,
        description,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // After creating the project, insert any provided tag_ids and assessment_ids
    const projectId = (data as { id?: string })?.id;
    if (projectId) {
      // Handle tag_ids on create (optional)
      const tag_ids_raw = Array.isArray(body?.tag_ids) ? body.tag_ids : undefined;
      if (tag_ids_raw) {
        const tagIds: string[] = tag_ids_raw
          .map((t: unknown) => (typeof t === "string" ? t : undefined))
          .filter((t: string | undefined): t is string => Boolean(t));
        const uniqueTagIds = Array.from(new Set(tagIds));
        if (uniqueTagIds.length > 0) {
          try {
            const tagJoinRows = uniqueTagIds.map((tag_id) => ({ project_id: projectId, tag_id }));
            const { error: tagsErr } = await supabase
              .from("projects_tags")
              .insert(tagJoinRows);
            if (tagsErr) {
              console.error("Failed to insert project tags on create:", tagsErr);
            }
          } catch (e) {
            console.error("Unhandled error inserting tags on create:", e);
          }
        }
      }

      // Handle assessment_ids on create (optional)
      const assessment_ids_raw = Array.isArray(body?.assessment_ids)
        ? body.assessment_ids
        : undefined;
      if (assessment_ids_raw) {
        const assessmentIds: string[] = assessment_ids_raw
          .map((a: unknown) => (typeof a === "string" ? a : undefined))
          .filter((a: string | undefined): a is string => Boolean(a));
        const uniqueAssessmentIds = Array.from(new Set(assessmentIds));
        if (uniqueAssessmentIds.length > 0) {
          try {
            const assessmentJoinRows = uniqueAssessmentIds.map((assessment_id) => ({
              project_id: projectId,
              assessment_id,
            }));
            const { error: assessErr } = await supabase
              .from("projects_assessments")
              .insert(assessmentJoinRows);
            if (assessErr) {
              console.error(
                "Failed to insert project assessments on create:",
                assessErr,
              );
            }
          } catch (e) {
            console.error("Unhandled error inserting assessments on create:", e);
          }
        }
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
