import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "@/types/common";

/**
 * GET /api/vpats/[vpatId]/criteria/[code]/issues
 * Returns list of open issue IDs for the VPAT's project filtered by WCAG criterion code.
 * Shape: { data: string[]; count: number }
 */
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ vpatId: UUID; code: string }> },
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

    const { vpatId, code } = await ctx.params;

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
          .filter(
            (id): id is string => typeof id === "string" && id.length > 0,
          ),
      ),
    );

    if (assessmentIds.length === 0) {
      return NextResponse.json({ data: [], count: 0 }, { status: 200 });
    }

    // Resolve issues associated with those assessments
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
            .filter(
              (id): id is string => typeof id === "string" && id.length > 0,
            ),
        ),
      );
    }

    if (issueIds.length === 0) {
      return NextResponse.json({ data: [], count: 0 }, { status: 200 });
    }

    // Filter issues by the requested WCAG code using the aggregated criteria view
    const { data: filtered, error: critErr } = await supabase
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

    const matchedIds: string[] = [];
    for (const row of filtered || []) {
      const codes =
        (row as { issue_criteria_agg?: Array<{ criteria_codes?: string[] }> })
          .issue_criteria_agg?.[0]?.criteria_codes || [];
      if (codes.includes(code)) {
        matchedIds.push((row as { id: string }).id);
      }
    }

    return NextResponse.json(
      { data: matchedIds, count: matchedIds.length },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching issues by criterion for VPAT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
