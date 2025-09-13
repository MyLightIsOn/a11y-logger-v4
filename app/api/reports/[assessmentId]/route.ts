import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildAssessmentReportInput } from "@/lib/reports";
import { buildMasterPromptPair } from "@/lib/ai/report-ai";
import { invokeModelJson } from "@/lib/ai/model-wrapper";
import {
  validateReportJson,
  validatePersonaSummaryJson,
  sortPersonaSummaries,
} from "@/lib/ai/output-validation";
import { buildPersonaPromptByName, PERSONAS } from "@/lib/ai/persona-prompts";
import type { Report, PersonaSummary } from "@/lib/validation/report";
import { reportSchema } from "@/lib/validation/report";

// Request body schema for POST /api/reports/[assessmentId]
const postBodySchema = z
  .object({
    mode: z.enum(["master", "personas"]).default("master"),
    includePatterns: z.boolean().optional(),
  })
  .strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Dynamic route param (must await in Next.js 15+ when using async handlers)
    const { assessmentId } = await params;
    if (!assessmentId) {
      return NextResponse.json(
        { error: "Missing assessmentId" },
        { status: 400 },
      );
    }

    // Parse body
    let body: z.infer<typeof postBodySchema>;
    try {
      const raw = await request.json();
      body = postBodySchema.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    // Build the strict AssessmentInput payload (handles auth scoping internally)
    let input: Awaited<ReturnType<typeof buildAssessmentReportInput>>;
    try {
      input = await buildAssessmentReportInput(assessmentId);
    } catch {
      // Either not found or not authorized to see this assessment
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Optional: includePatterns not implemented in this phase; reserved for Phase 4
    // if (body.includePatterns) { /* run pattern explainer, append to input */ }

    if (body.mode === "master") {
      // Build and call master prompt
      const { system, user: userPrompt } = buildMasterPromptPair(input);

      const { parsed: modelJson } = await invokeModelJson<unknown>({
        system,
        user: userPrompt,
        options: { temperature: 0.5 },
      });

      const validated = validateReportJson(modelJson, {
        requireAllPersonas: true,
      });
      if (!validated.ok) {
        return NextResponse.json(
          { error: "Invalid model output", details: validated.error },
          { status: 422 },
        );
      }

      // Success
      return NextResponse.json(validated.value satisfies Report);
    }

    // personas mode: generate six persona summaries concurrently and combine with an executive_summary
    const personaPromises = (PERSONAS as readonly string[]).map(async (p) => {
      const { system, user: userPrompt } = buildPersonaPromptByName(
        p as (typeof PERSONAS)[number],
        input,
      )!;
      const { parsed } = await invokeModelJson<unknown>({
        system,
        user: userPrompt,
        options: { temperature: 0.5 },
      });
      const v = validatePersonaSummaryJson(parsed);
      if (!v.ok) {
        throw new Error(`Invalid persona output for ${p}: ${v.error}`);
      }
      return v.value;
    });

    let personaSummaries: PersonaSummary[] = [];
    try {
      personaSummaries = await Promise.all(personaPromises);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Persona generation failed";
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    // Also call master prompt once to obtain an executive_summary matching schema
    const { system, user: userPrompt } = buildMasterPromptPair(input);
    const { parsed: masterJson } = await invokeModelJson<unknown>({
      system,
      user: userPrompt,
      options: { temperature: 0.5 },
    });
    const masterValidated = validateReportJson(masterJson, {
      requireAllPersonas: false,
    });
    if (!masterValidated.ok) {
      return NextResponse.json(
        {
          error: "Invalid master summary output",
          details: masterValidated.error,
        },
        { status: 422 },
      );
    }

    // Assemble final report: use exec summary from master; persona_summaries from micro-prompts
    const ordered = sortPersonaSummaries(personaSummaries);
    const report: Report = {
      assessment_id: masterValidated.value.assessment_id,
      executive_summary: masterValidated.value.executive_summary,
      persona_summaries: ordered,
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error(
      "Unhandled error in POST /api/reports/[assessmentId]:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Dynamic route param
    const { assessmentId } = await params;
    if (!assessmentId) {
      return NextResponse.json(
        { error: "Missing assessmentId" },
        { status: 400 },
      );
    }

    // Authorization: ensure the user owns the assessment
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

    // Fetch latest report for this assessment
    const { data: reportRows, error: reportsErr } = await supabase
      .from("reports")
      .select("id, assessment_id, payload, created_at")
      .eq("assessment_id", assessmentId)
      .order("created_at", { ascending: false })
      .limit(1);

    // If the table does not exist or query failed, treat as no report (Phase 12 optional)
    if (reportsErr || !reportRows || reportRows.length === 0) {
      return NextResponse.json(null, { status: 200 });
    }

    const row = reportRows[0] as {
      id: string;
      assessment_id: string;
      payload: unknown;
      created_at: string;
    };

    // Validate payload shape before returning
    const parsed = reportSchema.safeParse(row.payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Stored report is invalid",
          details: parsed.error.issues.map((i) => ({
            path: i.path,
            message: i.message,
          })),
        },
        { status: 422 },
      );
    }

    // Success
    return NextResponse.json(parsed.data satisfies Report);
  } catch (error) {
    console.error("Unhandled error in GET /api/reports/[assessmentId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
