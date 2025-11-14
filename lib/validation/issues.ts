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
  .enum(["2.0", "2.1", "2.2"])
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
      if (v === "2.0" || v === "2.1" || v === "2.2") {
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
  .trim()
  .url({ message: "Must be a valid URL" })
  .refine((v: string) => v.startsWith("http://") || v.startsWith("https://"), {
    message: "URL must start with http:// or https://",
  });

// Screenshots are URL strings; modest limits
const screenshotUrlSchema = urlSchema;

export const criterionRefSchema = z.preprocess(
  (raw) => {
    // Accept either { version, code: 'd.d.d' } or { version?, code: 'v|d.d.d' }
    if (raw && typeof raw === "object") {
      const r = raw as Record<string, unknown>;
      const codeVal = typeof r.code === "string" ? r.code : undefined;
      const versionVal = typeof r.version === "string" ? r.version : undefined;
      if (codeVal && codeVal.includes("|")) {
        const [maybeVersion, maybeCode] = codeVal.split("|", 2);
        if (maybeVersion && maybeCode) {
          // If version is missing, take it from code; otherwise keep provided version
          const finalVersion = (versionVal ?? maybeVersion) as unknown;
          return { ...r, version: finalVersion, code: maybeCode };
        }
      }
    }
    return raw;
  },
  z
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
      // If the original code had an embedded version that disagrees with version, flag it
      // This is a soft check: we only can validate allowlist reliably.
      const key = `${val.version}|${val.code}`;
      const allow = getCriteriaAllowlist();
      if (!allow.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown WCAG criterion: ${val.code} (version ${val.version})`,
          path: ["code"],
        });
      }
    }),
);

export const createIssueSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title is too long"),
    description: z.string().trim().max(5000).optional(),
    severity: severityEnum,
    status: statusEnum,
    suggested_fix: z.string().trim().max(5000).optional(),
    impact: z.string().trim().max(5000).optional(),
    url: urlSchema.optional(),
    selector: z.string().trim().max(2000).optional(),
    code_snippet: z.string().trim().max(10000).optional(),
    screenshots: z.array(screenshotUrlSchema).max(10).optional(),
    tag_ids: z.array(z.string()).optional(),
    assessment_id: z.string().uuid().optional(),
    criteria: z.array(criterionRefSchema).default([]),
  })
  .strict();

export type CreateIssueSchema = typeof createIssueSchema;
export type CreateIssueInput = z.infer<typeof createIssueSchema>;

/** Utility to deduplicate a criteria array by version+code. */
export function dedupeCriteria<
  T extends { version: WcagVersion; code: string },
>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of arr || []) {
    const key = `${it.version}|${it.code}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }
  return out;
}

/**
 * Validate a CreateIssue request. Returns the parsed value or throws ZodError.
 */
export function validateCreateIssue(input: unknown): CreateIssueRequest {
  const parsed = createIssueSchema.parse(input);
  // cast to CreateIssueRequest since the schema matches the shape
  return parsed as CreateIssueRequest;
}

/**
 * Validate an UpdateIssue request. Returns the parsed value.
 * Note: further validation (e.g., assessment/version checks) should be performed server-side.
 */
export function validateUpdateIssue(input: unknown) {
  return updateIssueSchema.parse(input);
}

/**
 * Update/Patch schema for Issues.
 * - All fields optional.
 * - criteria, when provided, represents the full desired set (may be empty to clear).
 */
export const updateIssueSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    severity: severityEnum.optional(),
    status: statusEnum.optional(),
    suggested_fix: z.string().trim().max(5000).optional(),
    impact: z.string().trim().max(5000).optional(),
    url: urlSchema.optional(),
    selector: z.string().trim().max(2000).optional(),
    code_snippet: z.string().trim().max(10000).optional(),
    screenshots: z.array(screenshotUrlSchema).max(10).optional(),
    tag_ids: z.array(z.string()).optional(),
    // Allow null to explicitly clear the assessment link on PATCH; coerce empty string -> null
    assessment_id: z
      .preprocess((v) => (v === "" ? null : v), z.string().uuid().nullable())
      .optional(),
    criteria: z.array(criterionRefSchema).optional(),
  })
  .strict();

export type UpdateIssueSchema = typeof updateIssueSchema;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
