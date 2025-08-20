import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { Tag } from "@/types/tag";
import type { Assessment } from "@/types/assessment";
import { wcagVersionEnum } from "@/lib/validation/issues";

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

    // Fetch assessments for the current user with tags via join table
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
      .eq("user_id", user.id)
      .order(sortBy, { ascending: sortOrder });

    if (error) {
      throw error;
    }

    // Transform the data to flatten the tags structure
    // Define the shape returned by Supabase for assessments with joined tags
  type AssessmentRowWithJoin = Assessment & { assessments_tags?: { tags: Tag }[] };

  const transformedData =
      (data as AssessmentRowWithJoin[] | null)?.map((assessment) => ({
        ...assessment,
        tags:
          assessment.assessments_tags?.map((at: { tags: Tag }) => at.tags) || [],
      })) || [];

    return NextResponse.json({
      data: transformedData,
      count: transformedData?.length || 0,
    });
  } catch (error) {
    console.error("Error fetching assessments:", error);
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

    const body = await request.json();
    const name = (body?.name ?? "").toString().trim();
    const description =
      typeof body?.description === "string"
        ? body.description.trim()
        : undefined;
    const wcag_version_raw = body?.wcag_version;
    const tag_ids_raw = Array.isArray(body?.tag_ids) ? body.tag_ids : undefined;

    if (!name) {
      return NextResponse.json(
        { error: "Assessment name is required" },
        { status: 400 },
      );
    }

    // Validate wcag_version explicitly using existing enum
    let wcag_version: string;
    try {
      wcag_version = wcagVersionEnum.parse(wcag_version_raw);
    } catch {
      return NextResponse.json(
        {
          error:
            "wcag_version is required and must be one of '2.0' | '2.1' | '2.2'",
        },
        { status: 400 },
      );
    }

    // Create assessment row first
    const { data: created, error: createErr } = await supabase
      .from("assessments")
      .insert({
        name,
        description,
        wcag_version,
        user_id: user.id,
      })
      .select()
      .single();

    if (createErr) {
      throw createErr;
    }

    // If tag_ids are provided, insert into join table
    const tag_ids: string[] | undefined = tag_ids_raw
      ?.map((t: unknown) => (typeof t === "string" ? t : undefined))
      .filter((t: string | undefined): t is string => Boolean(t));

    if (created?.id && tag_ids && tag_ids.length > 0) {
      const joinRows = tag_ids.map((tag_id) => ({
        assessment_id: created.id,
        tag_id,
      }));

      const { error: joinErr } = await supabase
        .from("assessments_tags")
        .insert(joinRows);

      if (joinErr) {
        console.error("Failed to insert assessment tags:", joinErr);
        // Non-fatal: we still return the created assessment row
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
