import { z } from "zod";
import wcagList from "@/data/wcag-criteria.json";
import type { CreateIssueRequest, WcagVersion } from "@/types/issue";

// Enumerations aligned with existing type aliases
export const severityEnum = z.enum(["1", "2", "3", "4"], {
  required_error: "Severity is required",
  invalid_type_error: "Severity must be one of '1' | '2' | '3' | '4'",
});

export const statusEnum = z.enum(["open", "closed", "archive"], {
  required_error: "Status is required",
  invalid_type_error: "Status must be one of 'open' | 'closed' | 'archive'",
});

export const wcagVersionEnum = z
  .enum(["2.1", "2.2"])
  .transform((v) => v as WcagVersion);

// Build a cached allowlist: key = `${version}|${code}` -> {name, level}
export type WcagJsonItem = {
  code: string;
  name: string;
  level: "A" | "AA" | "AAA";
  versions: string[];
};
const buildAllowlist = () => {
  const map = new Map<string, { name: string; level: "A" | "AA" | "AAA" }>();
  (wcagList as WcagJsonItem[]).forEach((item) => {
    if (
      !item?.code ||
      !item?.name ||
      !item?.level ||
      !Array.isArray(item?.versions)
    )
      return;
    item.versions.forEach((v) => {
      if (v === "2.1" || v === "2.2") {
        map.set(`${v}|${item.code}`, { name: item.name, level: item.level });
      }
    });
  });
  return map;
};
let _criteriaAllowlist: Map<
  string,
  { name: string; level: "A" | "AA" | "AAA" }
> | null = null;
export function getCriteriaAllowlist() {
  if (!_criteriaAllowlist) _criteriaAllowlist = buildAllowlist();
  return _criteriaAllowlist;
}

// Basic URL schema (allows http/https only)
const urlSchema = z
  .string()
  .url({ message: "Must be a valid URL" })
  .refine((v) => v.startsWith("http://") || v.startsWith("https://"), {
    message: "URL must start with http:// or https://",
  });

// Screenshots are URL strings; modest limits
const screenshotUrlSchema = urlSchema;

export const criterionRefSchema = z
  .object({
    code: z
      .string()
      .min(3, "Code is required")
      .regex(/^\d+\.\d+\.\d+$/, {
        message: "Code must be in the form d.d.d (e.g., 1.4.3)",
      }),
    version: wcagVersionEnum,
  })
  .superRefine((val, ctx) => {
    const key = `${val.version}|${val.code}`;
    const allow = getCriteriaAllowlist();
    if (!allow.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unknown WCAG criterion: ${val.code} (version ${val.version})`,
        path: ["code"],
      });
    }
  });

export const createIssueSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200, "Title is too long"),
    description: z.string().max(5000).optional(),
    severity: severityEnum,
    status: statusEnum,
    suggested_fix: z.string().max(5000).optional(),
    impact: z.string().max(5000).optional(),
    url: urlSchema.optional(),
    selector: z.string().max(2000).optional(),
    code_snippet: z.string().max(10000).optional(),
    screenshots: z.array(screenshotUrlSchema).max(10).optional(),
    tag_ids: z.array(z.string()).optional(),
    criteria: z
      .array(criterionRefSchema)
      .min(1, "Select at least one WCAG criterion")
      .optional(),
  })
  .strict();

export type CreateIssueSchema = typeof createIssueSchema;
export type CreateIssueInput = z.infer<typeof createIssueSchema>;

/**
 * Validate a CreateIssue request. Returns the parsed value or throws ZodError.
 */
export function validateCreateIssue(input: unknown): CreateIssueRequest {
  const parsed = createIssueSchema.parse(input);
  // cast to CreateIssueRequest since the schema matches the shape
  return parsed as CreateIssueRequest;
}
