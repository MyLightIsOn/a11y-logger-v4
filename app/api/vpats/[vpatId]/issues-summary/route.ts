import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "@/types/common";

/**
 * GET /api/vpats/[vpatId]/issues-summary
 * Returns counts of open issues per WCAG criterion code for the VPAT's project.
 * Shape: { data: Array<{ code: string; count: number }>, total: number }
 */
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ vpatId: UUID }> },
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

    const { vpatId } = await ctx.params;

    // Resolve VPAT to project id
    const { data: vpatRow, error: vpatErr } = await supabase
      .from("vpat")
      .select("id, project_id")
      .eq("id", vpatId)
      .single();

    if (vpatErr || !vpatRow) {
      return NextResponse.json({ error: "VPAT not found" }, { status: 404 });
    }

    const projectId = (vpatRow as { project_id: UUID }).project_id;

    // Fetch assessment IDs for this project
    const { data: paRows, error: paErr } = await supabase
      .from("projects_assessments")
      .select("assessment_id")
      .eq("project_id", projectId);
    if (paErr) throw paErr;

    const assessmentIds = Array.from(
      new Set(
        ((paRows || []) as { assessment_id: string }[])
          .map((r) => r.assessment_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    );

    // If there are no assessments, summary is empty
    if (assessmentIds.length === 0) {
      return NextResponse.json({ data: [], total: 0 }, { status: 200 });
    }

    // Pull issues linked to those assessments by first resolving issue IDs via join, then fetching criteria aggregation — two-step approach
    let issueIds: string[] = [];
    {
      const { data: joinRows, error: joinErr } = await supabase
        .from("assessments_issues")
        .select("issue_id")
        .in("assessment_id", assessmentIds);
      if (joinErr) throw joinErr;
      issueIds = Array.from(
        new Set(
          ((joinRows || []) as { issue_id: string }[])
            .map((r) => r.issue_id)
            .filter((id): id is string => typeof id === "string" && id.length > 0),
        ),
      );
    }

    if (issueIds.length === 0) {
      return NextResponse.json({ data: [], total: 0 }, { status: 200 });
    }

    const { data: issuesWithCriteria, error: critErr } = await supabase
      .from("issues")
      .select(
        `
        id,
        status,
        user_id,
        issue_criteria_agg!inner(criteria_codes)
      `,
      )
      .in("id", issueIds)
      .eq("status", "open")
      .eq("user_id", user.id);

    if (critErr) throw critErr;

    // Aggregate criteria codes across all open issues for this project
    const counts = new Map<string, number>();
    for (const row of issuesWithCriteria || []) {
      const codes = (row as { issue_criteria_agg?: Array<{ criteria_codes?: string[] }> }).issue_criteria_agg?.[0]?.criteria_codes || [];
      for (const code of codes) {
        counts.set(code, (counts.get(code) || 0) + 1);
      }
    }

    const summary = Array.from(counts.entries()).map(([code, count]) => ({ code, count }));
    const total = summary.reduce((acc, it) => acc + it.count, 0);

    return NextResponse.json({ data: summary, total }, { status: 200 });
  } catch (error) {
    console.error("Error fetching issues summary for VPAT:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
