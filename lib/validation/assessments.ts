import { z } from "zod";
import { wcagVersionEnum } from "@/lib/validation/issues";

/**
 * Validation schemas for Assessment create/update operations.
 * Mirrors conventions used in lib/validation/issues.ts
 */

export const createAssessmentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(200, "Name is too long"),
    description: z.string().trim().max(5000).optional(),
    wcag_version: wcagVersionEnum,
  })
  .strict();

export type CreateAssessmentSchema = typeof createAssessmentSchema;
export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;

export const updateAssessmentSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    wcag_version: wcagVersionEnum.optional(),
  })
  .strict();

export type UpdateAssessmentSchema = typeof updateAssessmentSchema;
export type UpdateAssessmentInput = z.infer<typeof updateAssessmentSchema>;

/**
 * Helper validators for convenience and parity with issues validation.
 */
export function validateCreateAssessment(input: unknown): CreateAssessmentInput {
  return createAssessmentSchema.parse(input);
}

export function validateUpdateAssessment(input: unknown): UpdateAssessmentInput {
  return updateAssessmentSchema.parse(input);
}
