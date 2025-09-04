import { ZodError } from "zod";
import {
  PERSONAS,
  type Persona,
  reportSchema,
  type Report,
  personaSummarySchema,
  type PersonaSummary,
} from "@/lib/validation/report";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function formatZodError(err: ZodError): string {
  try {
    return err.issues
      .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
      .join("; ");
  } catch {
    return err.message;
  }
}

export type ValidateReportOptions = {
  requireAllPersonas?: boolean; // if true, enforce exactly the known personas set
};

/**
 * Validate a master-mode report JSON payload returned by the model.
 * - Enforces schema via reportSchema (uuid assessment_id, word budgets, etc.)
 * - Optionally enforces that persona_summaries contain exactly the known personas (no extras, none missing)
 */
export function validateReportJson(
  json: unknown,
  opts: ValidateReportOptions = {},
): ValidationResult<Report> {
  const parsed = reportSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: formatZodError(parsed.error) };
  }

  const value = parsed.data;

  if (opts.requireAllPersonas) {
    const expected = new Set<string>(PERSONAS as readonly string[]);
    const found = new Set<string>(
      (value.persona_summaries || []).map((p) => p.persona as string),
    );

    // Check missing
    const missing: string[] = [];
    for (const p of expected) if (!found.has(p)) missing.push(p);

    // Check extras
    const extras: string[] = [];
    for (const p of found) if (!expected.has(p)) extras.push(p);

    if (missing.length || extras.length) {
      const parts: string[] = [];
      if (missing.length) parts.push(`missing personas: ${missing.join(", ")}`);
      if (extras.length) parts.push(`unexpected personas: ${extras.join(", ")}`);
      return { ok: false, error: parts.join("; ") };
    }
  }

  return { ok: true, value };
}

/**
 * Validate a single persona summary JSON payload.
 * Provided for convenience when using persona micro-prompts.
 */
export function validatePersonaSummaryJson(
  json: unknown,
): ValidationResult<PersonaSummary> {
  const parsed = personaSummarySchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };
  return { ok: true, value: parsed.data };
}

/**
 * Utility to order persona summaries in the canonical PERSONAS order.
 * No-op if a persona is missing or extra; caller can decide to validate before reordering.
 */
export function sortPersonaSummaries(
  summaries: ReadonlyArray<PersonaSummary>,
): PersonaSummary[] {
  const order = new Map<Persona, number>(
    (PERSONAS as readonly Persona[]).map((p, i) => [p, i] as const),
  );
  return [...summaries].sort((a, b) => {
    const ai = order.get(a.persona as Persona) ?? Number.MAX_SAFE_INTEGER;
    const bi = order.get(b.persona as Persona) ?? Number.MAX_SAFE_INTEGER;
    return ai - bi;
  });
}
