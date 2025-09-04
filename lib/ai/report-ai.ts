import { z } from "zod";

/**
 * Master prompt builder for report generation
 *
 * - System+User split
 * - Zod schemas for strict JSON guidance (for documentation/consumers)
 * - Simple token budgeting guards
 */

// Minimal AssessmentInput shape to embed in prompt (keep local to avoid coupling until Phase 0 is done)
export const assessmentInputSchema = z.object({
  assessment: z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().min(1),
    project: z.string().optional(),
    date: z.string().min(4), // YYYY-MM-DD
  }),
  stats: z.object({
    by_severity: z.record(z.number()).default({}),
    by_principle: z.record(z.number()).default({}),
    by_wcag: z
      .array(
        z.object({
          criterion: z.string(),
          name: z.string().optional(),
          count: z.number(),
        }),
      )
      .default([]),
  }),
  issues: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        severity: z.string().optional(),
        wcag: z
          .array(
            z.object({
              version: z.string().optional(),
              criterion: z.string(),
              level: z.string().optional(),
            }),
          )
          .optional()
          .default([]),
        component: z.string().optional(),
        url: z.string().optional(),
        impact: z.string().optional(),
      }),
    )
    .default([]),
  // Optional helper patterns if provided by an earlier step
  patterns: z
    .array(
      z.object({
        pattern: z.string(),
        count: z.number().optional(),
        components: z.array(z.string()).optional(),
        wcag: z.array(z.string()).optional(),
      }),
    )
    .optional(),
});

export type AssessmentInput = z.infer<typeof assessmentInputSchema>;

// Output schema (documentation-level; parsing/validation is handled elsewhere in later phases)
export const masterReportOutputSchema = z
  .object({
    assessment_id: z.union([z.string(), z.number()]),
    executive_summary: z.object({
      overview: z.string(),
      top_risks: z.array(z.string()),
      quick_wins: z.array(z.string()),
      estimated_user_impact: z.enum(["Low", "Medium", "High", "Critical"]),
    }),
    persona_summaries: z.array(
      z.object({
        persona: z.string(),
        summary: z.string(),
      }),
    ),
  })
  .strict();

// System message as described in the planning docs (planning/report_generation.md §6)
export const MASTER_SYSTEM_PROMPT =
  "Do not invent issues or pages. Use only provided data. If evidence is insufficient, say so briefly.";

// Internal helpers for token budgeting
function truncate(
  str: string | undefined,
  maxChars: number,
): string | undefined {
  if (!str) return str;
  return str.length > maxChars ? str.slice(0, maxChars) + "…" : str;
}

function clampIssues(
  input: AssessmentInput,
  maxIssues: number,
  maxDescChars: number,
): AssessmentInput {
  const issues = (input.issues || [])
    .slice(0, Math.max(0, maxIssues))
    .map((it) => ({
      ...it,
      title: truncate(it.title, 180),
      description: truncate(it.description, maxDescChars),
      impact: truncate(it.impact, 500),
    }));
  return { ...input, issues };
}

export type MasterPromptOptions = {
  maxIssues?: number; // default 80
  maxDescriptionChars?: number; // default 800
};

/**
 * Build the master prompt pair (system + user) for the report generator.
 * Ensures STRICT JSON instruction and embeds input JSON.
 */
export function buildMasterPromptPair(
  rawInput: AssessmentInput,
  opts: MasterPromptOptions = {},
): { system: string; user: string } {
  const { maxIssues = 80, maxDescriptionChars = 800 } = opts;
  const input = clampIssues(rawInput, maxIssues, maxDescriptionChars);

  // Serialize compact JSON to save tokens
  const inputJson = JSON.stringify(input);

  const user = [
    "You are an accessibility expert. Generate an accessibility report summary for ONE assessment using ONLY the issues provided.",
    "",
    "RESTRICTIONS",
    "- Do not invent issues, pages, or criteria not present in the data.",
    "- Aggregate and synthesize; do not copy issue titles verbatim unless it helps clarity.",
    "- Use plain language, professional tone, and brief sentences.",
    '- Cap each persona "summary" at 150 words.',
    "- Output STRICT JSON that matches the requested schema. Do not include markdown or commentary.",
    "",
    "INPUT",
    inputJson,
    "",
    "TASKS",
    "Executive Summary",
    "   - In ≤120 words, describe overall accessibility health, key themes (e.g., contrast, focus order, missing labels), and priority areas.",
    '   - Provide 2–4 "top_risks" rooted in high/critical issues and commonly affected flows.',
    '   - Provide 2–4 "quick_wins" (e.g., raise button contrast, add form labels, fix visible focus).',
    '   - Estimate "estimated_user_impact" as Low/Medium/High/Critical based on severity distribution and affected flows.',
    "",
    "VALIDATION",
    "- Ensure counts and examples align with the provided data.",
    "- Prefer grouping by recurring patterns across issues rather than listing one-off bugs.",
    "- Keep JSON valid and match the schema exactly.",
    "",
    "OUTPUT",
    "Return only the JSON object:",
    JSON.stringify(
      {
        assessment_id: "<id from input.assessment.id>",
        executive_summary: {
          overview: "string",
          top_risks: ["string"],
          quick_wins: ["string"],
          estimated_user_impact: "Low|Medium|High|Critical",
        },
        persona_summaries: [
          { persona: "Screen reader user (blind)", summary: "<=150 words" },
          { persona: "Keyboard-only / motor", summary: "<=150 words" },
          { persona: "Low vision / magnification", summary: "<=150 words" },
          { persona: "Color vision deficiency", summary: "<=150 words" },
          { persona: "Cognitive / attention", summary: "<=150 words" },
          { persona: "Deaf / hard of hearing", summary: "<=150 words" },
        ],
      },
      null,
      0,
    ),
  ].join("\n");

  return { system: MASTER_SYSTEM_PROMPT, user };
}
