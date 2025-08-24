import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

    // Query to get aggregated WCAG criteria counts for the current user
    // This joins issues with issue_criteria_agg to get criteria codes, then aggregates by code
    const { data, error } = await supabase
      .from("issues")
      .select(
        `
        issue_criteria_agg!inner(criteria_codes)
      `,
      )
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching criteria summary:", error);
      return NextResponse.json(
        { error: "Failed to fetch criteria summary" },
        { status: 500 },
      );
    }

    // Aggregate criteria codes across all issues
    const criteriaCounts = new Map<string, number>();

    for (const issue of data || []) {
      const codes = issue.issue_criteria_agg[0]?.criteria_codes || [];
      for (const code of codes) {
        criteriaCounts.set(code, (criteriaCounts.get(code) || 0) + 1);
      }
    }

    // Convert to array format
    const summary = Array.from(criteriaCounts.entries()).map(
      ([code, count]) => ({
        code,
        count,
      }),
    );

    return NextResponse.json({
      data: summary,
      total: summary.reduce((sum, item) => sum + item.count, 0),
    });
  } catch (error) {
    console.error("Error in criteria summary endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
