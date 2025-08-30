// Types re-exported from lib/validation/report to provide a stable import path for domain types.
// These types are inferred from Zod schemas to ensure parity between runtime validation and compile-time types.

export type {
  AssessmentInput,
  AssessmentIssueInput,
  WcagEntry,
  StatsBySeverity,
  StatsByPrinciple,
  StatsByWcag,
  Patterns,
  ExecutiveSummary,
  PersonaSummary,
  Report,
  SeverityBucket,
  Persona,
  Principle,
  WcagLevel,
} from "@/lib/validation/report";

export {
  assessmentInputSchema,
  wcagEntrySchema,
  reportSchema,
  executiveSummarySchema,
  personaSummarySchema,
  patternsSchema,
  patternItemSchema,
  severityBucketEnum,
  personaEnum,
  principleEnum,
  wcagLevelEnum,
  PERSONAS,
  PRINCIPLES,
  SEVERITY_BUCKETS,
} from "@/lib/validation/report";
