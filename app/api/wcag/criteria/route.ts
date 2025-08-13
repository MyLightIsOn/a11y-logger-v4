import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/wcag/criteria
 * Returns canonical WCAG criteria rows (version-scoped), for use in client controls.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check consistent with other routes
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("wcag_criteria")
      .select("code, name, version, level")
      .order("version", { ascending: true })
      .order("code", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data: data || [], count: data?.length || 0 });
  } catch (error) {
    console.error("Error fetching WCAG criteria:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
