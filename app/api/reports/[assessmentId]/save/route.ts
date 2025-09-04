import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { reportSchema, type Report } from "@/lib/validation/report";

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

    // Insert into reports table using existing pattern (payload jsonb)
    const { data: inserted, error: insertErr } = await supabase
      .from("reports")
      .insert({
        assessment_id: assessmentId,
        user_id: user.id,
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
