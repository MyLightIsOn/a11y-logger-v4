import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { Tag } from "@/types/tag";

/**
 * Issues collection route (read-only for now)
 * GET /api/issues?sortBy=created_at&sortOrder=asc|desc
 * Response: { data: Issue[]; count: number }
 */
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

    // Get query parameters (support only sortBy/sortOrder consistent with patterns)
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrderAsc = searchParams.get("sortOrder") === "asc"; // default desc if omitted

    // Fetch issues for the current user including tags when available
    // Assumes a join table `issues_tags` analogous to `projects_tags`
    const { data, error } = await supabase
      .from("issues")
      .select(
        `
        *,
        issues_tags(
          tags(*)
        )
      `,
      )
      .eq("user_id", user.id)
      .order(sortBy, { ascending: sortOrderAsc });

    if (error) {
      throw error;
    }

    // Flatten tags from the join table if present
    const transformedData =
      data?.map((issue: any) => ({
        ...issue,
        tags: issue.issues_tags?.map((it: { tags: Tag }) => it.tags) || [],
      })) || [];

    return NextResponse.json({
      data: transformedData,
      count: transformedData.length,
    });
  } catch (error) {
    console.error("Error fetching issues:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
