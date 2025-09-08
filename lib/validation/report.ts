import { z } from "zod";
import { wcagVersionEnum } from "@/lib/validation/issues";

/**
 *
 * This module defines Zod schemas (and inferred TypeScript types) for:
 *  - AssessmentInput: input payload sent to the model
 *  - Report: model output for executive summary and persona summaries
 *  - Patterns: optional helper output that can be fed back into the master prompt
 *
 * Notes:
 *  - We intentionally reuse existing utilities (wcagVersionEnum) for consistency.
 *  - Word budgets are enforced via a simple word-count refine (<=120 for exec overview; <=150 for persona summaries).
 *  - Criteria codes follow the d.d.d pattern (e.g., 1.4.3).
 */

// Shared enums
export const severityBucketEnum = z.enum(["Critical", "High", "Medium", "Low"]);
export type SeverityBucket = z.infer<typeof severityBucketEnum>;

export const principleEnum = z.enum([
  "Perceivable",
  "Operable",
  "Understandable",
  "Robust",
]);
export type Principle = z.infer<typeof principleEnum>;

export const wcagLevelEnum = z.enum(["A", "AA", "AAA"]);
export type WcagLevel = z.infer<typeof wcagLevelEnum>;

export const personaEnum = z.enum([
  "Screen reader user (blind)",
  "Low vision / magnification",
  "Color vision deficiency",
  "Keyboard-only / motor",
  "Cognitive / attention",
  "Deaf / hard of hearing",
]);
export type Persona = z.infer<typeof personaEnum>;

// Basic validators
const yyyyMmDd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, { message: "Date must be YYYY-MM-DD" });

const criterionCode = z
  .string()
  .min(3)
  .regex(/^\d+\.\d+\.\d+$/u, {
    message: "Criterion must be d.d.d (e.g., 1.4.3)",
  });
//TODO this error needs to surface to the UI, right now it just shows a 400 error.
const urlSchema = z
  .string()
  .trim()
  .url({ message: "Must be a valid URL" })
  .refine((v) => v.startsWith("http://") || v.startsWith("https://"), {
    message: "URL must start with http:// or https://",
  });

// 1) AssessmentInput (payload to the model)
export const wcagEntrySchema = z.object({
  version: wcagVersionEnum, // "2.0"|"2.1"|"2.2"
  criterion: criterionCode,
  level: wcagLevelEnum,
});

export const assessmentMetaSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  date: yyyyMmDd,
});

export const statsBySeveritySchema = z.object({
  Critical: z.number().int().min(0),
  High: z.number().int().min(0),
  Medium: z.number().int().min(0),
  Low: z.number().int().min(0),
});

export const statsByPrincipleSchema = z.object({
  Perceivable: z.number().int().min(0),
  Operable: z.number().int().min(0),
  Understandable: z.number().int().min(0),
  Robust: z.number().int().min(0),
});

export const statsByWcagSchema = z.array(
  z.object({
    criterion: criterionCode,
    name: z.string().min(1),
    count: z.number().int().min(0),
  }),
);

export const issueInputSchema = z
  .object({
    id: z.string().min(1), // stored as UUID in DB; keep flexible string here for portability
    title: z.string().min(1),
    description: z.string().min(1).max(10000).optional(),
    severity: severityBucketEnum, // mapped from data severities (1-4) → buckets
    wcag: z.array(wcagEntrySchema).default([]),
    component: z.string().min(1).optional(),
    url: urlSchema.optional(),
    impact: z.string().min(1).max(5000).optional(),
  })
  .strict();

export const assessmentInputSchema = z
  .object({
    assessment: assessmentMetaSchema,
    stats: z.object({
      by_severity: statsBySeveritySchema,
      by_principle: statsByPrincipleSchema,
      by_wcag: statsByWcagSchema,
    }),
    issues: z.array(issueInputSchema),
  })
  .strict();

// 2) Optional Patterns output schema
export const patternItemSchema = z
  .object({
    pattern: z.string().min(1),
    count: z.number().int().min(1),
    components: z.array(z.string().min(1)).default([]),
    wcag: z.array(criterionCode).default([]),
  })
  .strict();

export const patternsSchema = z
  .object({
    patterns: z.array(patternItemSchema).default([]),
    high_risk_patterns: z.array(z.string().min(1)).default([]),
  })
  .strict();

// 3) Model output (Report) schema
const wordsAtMost = (maxWords: number) =>
  z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : s))
    .refine(
      (s) => (s ? s.split(/\s+/u).filter(Boolean).length <= maxWords : true),
      {
        message: `Must be at most ${maxWords} words`,
      },
    );

export const executiveSummarySchema = z
  .object({
    overview: wordsAtMost(120),
    top_risks: z.array(z.string().min(1)).min(2).max(4),
    quick_wins: z.array(z.string().min(1)).min(2).max(4),
    estimated_user_impact: severityBucketEnum,
  })
  .strict();

export const personaSummarySchema = z
  .object({
    persona: personaEnum,
    summary: wordsAtMost(150),
  })
  .strict();

export const reportSchema = z
  .object({
    assessment_id: z.string().uuid(),
    executive_summary: executiveSummarySchema,
    persona_summaries: z.array(personaSummarySchema).min(1),
  })
  .strict();

// Export inferred types for developer ergonomics
export type AssessmentInput = z.infer<typeof assessmentInputSchema>;
export type AssessmentIssueInput = z.infer<typeof issueInputSchema>;
export type WcagEntry = z.infer<typeof wcagEntrySchema>;
export type StatsBySeverity = z.infer<typeof statsBySeveritySchema>;
export type StatsByPrinciple = z.infer<typeof statsByPrincipleSchema>;
export type StatsByWcag = z.infer<typeof statsByWcagSchema>;
export type Patterns = z.infer<typeof patternsSchema>;
export type ExecutiveSummary = z.infer<typeof executiveSummarySchema>;
export type PersonaSummary = z.infer<typeof personaSummarySchema>;
export type Report = z.infer<typeof reportSchema>;

// Convenience lists (may be centralized in a constants module in Phase 0 Step 2)
export const PERSONAS: readonly Persona[] =
  personaEnum.options as unknown as readonly Persona[];
export const PRINCIPLES: readonly Principle[] =
  principleEnum.options as unknown as readonly Principle[];
export const SEVERITY_BUCKETS: readonly SeverityBucket[] =
  severityBucketEnum.options as unknown as readonly SeverityBucket[];
