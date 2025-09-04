import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { reportSchema, type Report } from "@/lib/validation/report";
import { buildAssessmentReportInput } from "@/lib/reports";

// Body must be a Report matching the assessmentId param
const saveBodySchema = reportSchema;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const supabase = await createClient();

    // Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Param
    const { assessmentId } = await params;
    if (!assessmentId) {
      return NextResponse.json(
        { error: "Missing assessmentId" },
        { status: 400 },
      );
    }

    // Verify assessment belongs to user
    const { data: assessmentRow, error: assessErr } = await supabase
      .from("assessments")
      .select("id, user_id")
      .eq("id", assessmentId)
      .single();

    if (assessErr || !assessmentRow) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (assessmentRow.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse and validate body
    let report: Report;
    try {
      const raw = await request.json();
      const parsed = saveBodySchema.parse(raw);
      report = parsed as Report;
    } catch (e) {
      const message =
        e instanceof z.ZodError ? "Invalid report" : "Invalid request body";
      const details =
        e instanceof z.ZodError
          ? e.issues.map((i) => ({ path: i.path, message: i.message }))
          : undefined;
      return NextResponse.json({ error: message, details }, { status: 400 });
    }

    // Ensure path param matches body.assessment_id
    if (report.assessment_id !== assessmentId) {
      return NextResponse.json(
        { error: "assessment_id mismatch between path and body" },
        { status: 400 },
      );
    }

    // Build derived fields for columns from current assessment context and report
    // Compute severity_counts and wcag_breakdown by reusing the report input builder
    let severity_counts: Record<string, number> | undefined;
    let wcag_breakdown: Record<string, unknown> | undefined;
    try {
      const input = await buildAssessmentReportInput(assessmentId);
      severity_counts = input?.stats?.by_severity;
      wcag_breakdown = {
        by_principle: input?.stats?.by_principle,
        by_wcag: input?.stats?.by_wcag,
      } as Record<string, unknown>;
    } catch {
      // If computing stats fails, continue with defaults; DB has defaults for jsonb columns
      severity_counts = undefined;
      wcag_breakdown = undefined;
    }

    // Map persona summaries to dedicated summary_* columns
    const personaMap = new Map<string, string>();
    for (const ps of report.persona_summaries || []) {
      if (ps?.persona && ps?.summary) personaMap.set(ps.persona, ps.summary);
    }

    const summary_screen_reader = personaMap.get("Screen reader user (blind)") || null;
    const summary_low_vision = personaMap.get("Low vision / magnification") || null;
    const summary_color_blind = personaMap.get("Color vision deficiency") || null;
    const summary_keyboard_only = personaMap.get("Keyboard-only / motor") || null;
    const summary_cognitive = personaMap.get("Cognitive / attention") || null;
    const summary_dhh = personaMap.get("Deaf / hard of hearing") || null;
    const summary_exec = report.executive_summary?.overview || null;

    // Insert into reports table with parsed columns + payload jsonb
    const { data: inserted, error: insertErr } = await supabase
      .from("reports")
      .insert({
        assessment_id: assessmentId,
        user_id: user.id,
        severity_counts: severity_counts as unknown as Record<string, unknown> | undefined,
        wcag_breakdown: wcag_breakdown as unknown as Record<string, unknown> | undefined,
        summary_screen_reader,
        summary_low_vision,
        summary_color_blind,
        summary_keyboard_only,
        summary_cognitive,
        summary_dhh,
        summary_exec,
        // Persist the full report under a payload column, as used by GET endpoint
        payload: report as unknown as Record<string, unknown>,
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      console.log(insertErr);
      return NextResponse.json(
        { error: "Failed to save report" },
        { status: 500 },
      );
    }

    return NextResponse.json({ id: inserted.id as string });
  } catch (error) {
    console.error(
      "Unhandled error in POST /api/reports/[assessmentId]/save:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
