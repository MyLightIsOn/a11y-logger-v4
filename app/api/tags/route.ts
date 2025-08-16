import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/tags
 * Returns all available tags. Currently not scoped by user; adjust if needed later.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Auth check (consistent with other routes)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Basic list of tags ordered by label for stable UX
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("label", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data: data || [], count: data?.length || 0 });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
