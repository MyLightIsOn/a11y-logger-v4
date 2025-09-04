import {
  assessmentInputSchema as strictAssessmentInputSchema,
  type AssessmentInput as StrictAssessmentInput,
  PERSONAS,
  type Persona,
  personaSummarySchema,
  type PersonaSummary,
} from "@/lib/validation/report";

/**
 * Persona micro-prompt templates (Phase 2 - Step 8)
 *
 * - Six functions to build persona-specific prompts.
 * - Each prompt instructs the model to return a single persona JSON object only.
 * - Reuses strict AssessmentInput schema from lib/validation/report for type-safety.
 * - Provides small token guards similar to the master prompt.
 */

// Local light-weight schema for inputs to keep flexibility if upstream evolves
export type AssessmentInput = StrictAssessmentInput;

export const PERSONA_SYSTEM_PROMPT =
  "Do not invent issues or pages. Use only provided data. If evidence is insufficient, say so briefly.";

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
  return { ...input, issues } as AssessmentInput;
}

export type PersonaPromptOptions = {
  maxIssues?: number; // default 60 for micro prompts
  maxDescriptionChars?: number; // default 700
};

// Base builder shared by all personas
function buildPersonaPrompt(
  userLabel: Persona,
  rawInput: AssessmentInput,
  opts: PersonaPromptOptions = {},
): { system: string; user: string; persona: Persona } {
  const { maxIssues = 60, maxDescriptionChars = 700 } = opts;
  // Validate input shape defensively (no throw if already validated elsewhere)
  const inputParsed = strictAssessmentInputSchema.safeParse(rawInput);
  const safeInput: AssessmentInput = inputParsed.success
    ? inputParsed.data
    : (rawInput as AssessmentInput);
  const input = clampIssues(safeInput, maxIssues, maxDescriptionChars);

  const inputJson = JSON.stringify(input);

  const example = JSON.stringify(
    {
      persona: userLabel,
      summary: "<=150 words specific to this persona",
    },
    null,
    0,
  );

  const user = [
    "You are an accessibility expert.",
    "Generate a concise persona-specific summary for ONE assessment using ONLY the provided issues.",
    "",
    "RESTRICTIONS",
    "- Do not invent issues, pages, or criteria not present in the data.",
    "- Use plain language, professional tone, and brief sentences.",
    "- Cap summary at 150 words.",
    "- Output STRICT JSON for a single persona object only. Do not include markdown or commentary.",
    "",
    "INPUT",
    inputJson,
    "",
    "FOCUS",
    `- Address the perspective of: ${userLabel}.`,
    "- Highlight most relevant barriers, affected flows, mitigation guidance, and any residual risks.",
    "",
    "OUTPUT",
    "Return only this JSON object:",
    example,
  ].join("\n");

  return { system: PERSONA_SYSTEM_PROMPT, user, persona: userLabel };
}

// Individual persona helpers
export function buildScreenReaderPersonaPrompt(
  input: AssessmentInput,
  opts?: PersonaPromptOptions,
) {
  return buildPersonaPrompt(
    "Screen reader user (blind)" as Persona,
    input,
    opts,
  );
}

export function buildLowVisionPersonaPrompt(
  input: AssessmentInput,
  opts?: PersonaPromptOptions,
) {
  return buildPersonaPrompt(
    "Low vision / magnification" as Persona,
    input,
    opts,
  );
}

export function buildColorVisionPersonaPrompt(
  input: AssessmentInput,
  opts?: PersonaPromptOptions,
) {
  return buildPersonaPrompt("Color vision deficiency" as Persona, input, opts);
}

export function buildKeyboardMotorPersonaPrompt(
  input: AssessmentInput,
  opts?: PersonaPromptOptions,
) {
  return buildPersonaPrompt("Keyboard-only / motor" as Persona, input, opts);
}

export function buildCognitivePersonaPrompt(
  input: AssessmentInput,
  opts?: PersonaPromptOptions,
) {
  return buildPersonaPrompt("Cognitive / attention" as Persona, input, opts);
}

export function buildDeafHoHPersonaPrompt(
  input: AssessmentInput,
  opts?: PersonaPromptOptions,
) {
  return buildPersonaPrompt("Deaf / hard of hearing" as Persona, input, opts);
}

// Utility: validate a returned persona JSON (optional for callers)
export function validatePersonaJson(
  json: unknown,
): { ok: true; value: PersonaSummary } | { ok: false; error: string } {
  const parsed = personaSummarySchema.safeParse(json);
  if (parsed.success) return { ok: true, value: parsed.data };
  return { ok: false, error: parsed.error.message };
}

// Utility: quick factory by persona name
export function buildPersonaPromptByName(
  persona: Persona,
  input: AssessmentInput,
  opts?: PersonaPromptOptions,
) {
  switch (persona) {
    case "Screen reader user (blind)":
      return buildScreenReaderPersonaPrompt(input, opts);
    case "Low vision / magnification":
      return buildLowVisionPersonaPrompt(input, opts);
    case "Color vision deficiency":
      return buildColorVisionPersonaPrompt(input, opts);
    case "Keyboard-only / motor":
      return buildKeyboardMotorPersonaPrompt(input, opts);
    case "Cognitive / attention":
      return buildCognitivePersonaPrompt(input, opts);
    case "Deaf / hard of hearing":
      return buildDeafHoHPersonaPrompt(input, opts);
  }
}

export { PERSONAS };
