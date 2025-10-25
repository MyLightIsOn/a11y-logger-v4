import { getWcagByCode, type CriteriaDetail } from "@/lib/wcag/reference";
import { camelToTitle } from "@/lib/utils";
import type { VpatRowDraft } from "@/types/vpat";
/**
 * Parse a WCAG criterion code (e.g., "1.4.13") into its numeric tuple [1,4,13].
 * Returns null for invalid codes.
 */
export function parseWcagCode(code: string): [number, number, number] | null {
  if (typeof code !== "string") return null;
  const trimmed = code.trim();
  if (!/^\d+\.\d+\.\d+$/.test(trimmed)) return null;
  const parts = trimmed.split(".").map((s) => Number.parseInt(s, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return [parts[0], parts[1], parts[2]];
}

/**
 * Comparator for WCAG codes using numeric ordering by [g, s, c].
 * Unknown/invalid codes are placed after valid ones, preserving a stable tiebreaker by string.
 */
export function compareWcagCodes(a: string, b: string): number {
  const pa = parseWcagCode(a);
  const pb = parseWcagCode(b);
  if (pa && pb) {
    if (pa[0] !== pb[0]) return pa[0] - pb[0];
    if (pa[1] !== pb[1]) return pa[1] - pb[1];
    if (pa[2] !== pb[2]) return pa[2] - pb[2];
    return a.localeCompare(b);
  }
  if (pa && !pb) return -1;
  if (!pa && pb) return 1;
  return a.localeCompare(b);
}

/** Stable sort helper for lists that contain a `code` field. */
export function sortCriteriaByCode<T extends { code: string }>(
  list: readonly T[],
): T[] {
  // copy to keep stable and non-mutating
  return [...list].sort((x, y) => compareWcagCodes(x.code, y.code));
}

/**
 * Return all WCAG criteria from the shared reference, sorted numerically by code.
 * Consumers can filter by version or level as needed.
 */
export function getAllWcagCriteria(): CriteriaDetail[] {
  const byCode = getWcagByCode();
  const all = Array.from(byCode.values());
  return sortCriteriaByCode(all);
}

/**
 * Filter criteria by highest supported version being one of ["2.0","2.1","2.2"].
 * A helper useful when a consumer wants to include only those that include a minimum version.
 */
export function filterByMinVersion(
  criteria: readonly CriteriaDetail[],
  min: "2.0" | "2.1" | "2.2" = "2.0",
): CriteriaDetail[] {
  const order: Record<"2.0" | "2.1" | "2.2", number> = {
    "2.0": 0,
    "2.1": 1,
    "2.2": 2,
  };
  return criteria.filter((c) => {
    // if versions empty, assume newest per reference semantics elsewhere; include when min is lowest
    if (!c.versions || c.versions.length === 0) return min === "2.0";
    const maxIndex = Math.max(...c.versions.map((v) => order[v] ?? -1));
    return maxIndex >= order[min];
  });
}

/** Minimal shape for criteria items used in computeNextNEmpty */
export type CriterionForNext = { id: string; code: string };

/** Determine if a persisted draft row is effectively empty (no conformance and no non-empty remarks). */
export function isDraftRowEmpty(row: VpatRowDraft | undefined | null): boolean {
  if (!row) return true; // no row persisted yet is considered empty
  const hasConformance =
    row.conformance !== null && row.conformance !== undefined;
  const remarks = (row.remarks || "").trim();
  const hasRemarks = remarks.length > 0;
  return !hasConformance && !hasRemarks;
}

/**
 * Compute the next N criterion IDs that are empty in the draft rows, ordered by
 * ascending numeric WCAG code. Deterministic and unaffected by filled rows.
 */
export function computeNextNEmpty(
  criteria: readonly CriterionForNext[],
  draftRows:
    | readonly VpatRowDraft[]
    | Map<string, VpatRowDraft>
    | Record<string, VpatRowDraft>
    | undefined,
  n: number = 5,
): string[] {
  // Normalize draft rows into a Map keyed by wcag_criterion_id
  const byCriterionId = new Map<string, VpatRowDraft>();
  if (Array.isArray(draftRows)) {
    for (const r of draftRows) {
      if (r && typeof r.wcag_criterion_id === "string") {
        byCriterionId.set(r.wcag_criterion_id, r);
      }
    }
  } else if (draftRows instanceof Map) {
    for (const [k, v] of draftRows.entries()) {
      if (k && v) byCriterionId.set(k, v);
    }
  } else if (draftRows && typeof draftRows === "object") {
    for (const k of Object.keys(draftRows)) {
      const v = (draftRows as Record<string, VpatRowDraft>)[k];
      if (v) byCriterionId.set(k, v);
    }
  }

  const sorted = sortCriteriaByCode(criteria);
  const out: string[] = [];
  for (const c of sorted) {
    if (!c || typeof c.id !== "string" || !c.id) continue;
    const row = byCriterionId.get(c.id);
    if (isDraftRowEmpty(row)) {
      out.push(c.id);
      if (out.length >= n) break;
    }
  }
  return out;
}

/**
 * Normalize a free-form conformance string into one of the internal enum-like values used by the app.
 * - Accepts common variants and whitespace/casing differences.
 * - Maps to: "supports" | "partiallySupports" | "doesNotSupport" | "notApplicable".
 * - Any unrecognized value (including "Not Evaluated") becomes an empty string "" for "no selection".
 */
export function normalizeConformance(value: string | null | undefined): string {
  if (!value) return "";
  const v = value.trim().toLowerCase();
  switch (v) {
    case "supports":
      return "supports";
    case "partially supports":
    case "partiallysupports":
      return "partiallySupports";
    case "does not support":
    case "doesnotsupport":
      return "doesNotSupport";
    case "not applicable":
    case "notapplicable":
      return "notApplicable";
    default:
      // Unrecognized or "Not Evaluated" -> treat as empty selection
      return "";
  }
}

/**
 * Build a defaults object for form initialization from existing draft rows.
 * - Keys are WCAG codes sanitized for form field names (dots replaced with underscores, e.g., "1.4.13" -> "1_4_13").
 * - Values contain normalized conformance and remarks strings suitable for pre-filling inputs.
 */
export function getCriteriaDefaults(
  draftRows: readonly VpatRowDraft[] | undefined,
  codeById: Map<string, string>,
): Record<string, { conformance?: string; remarks?: string }> {
  const sanitize = (code: string) => code.replace(/\./g, "_");
  const out: Record<string, { conformance?: string; remarks?: string }> = {};
  if (!draftRows || draftRows.length === 0) return out;
  for (const row of draftRows) {
    if (!row || !row.wcag_criterion_id) continue;
    const code = codeById.get(row.wcag_criterion_id);
    if (!code) continue;
    const key = sanitize(code);
    out[key] = {
      conformance: normalizeConformance(row.conformance ?? null),
      remarks: row.remarks ?? "",
    };
  }
  return out;
}

/**
 * Build a Map of wcag_criterion_id -> code from a possibly sparse/partial list.
 * - Ignores items with missing or non-string id/code values.
 * - Safe to call with undefined; returns an empty Map in that case.
 */
export function getCodeById(
  wcagCriteria:
    | Array<{ id?: string | null; code?: string | null }>
    | readonly { id?: string | null; code?: string | null }[]
    | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of wcagCriteria || []) {
    const id = c?.id;
    const code = c?.code;
    if (typeof id === "string" && id && typeof code === "string" && code) {
      map.set(id, code);
    }
  }
  return map;
}

/**
 * Build a Map of WCAG code -> wcag_criterion_id for quick lookups by code string.
 * - Accepts undefined or sparse inputs; invalid entries are skipped.
 * - Inverse of getCodeById.
 */
export function buildCodeToIdMap(
  wcagCriteria: Array<{ id?: string | null; code?: string | null }> | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of wcagCriteria || []) {
    const id = c?.id;
    const code = c?.code;
    if (typeof id === "string" && id && typeof code === "string" && code) {
      map.set(code, id);
    }
  }
  return map;
}

/**
 * Build the imperative handle used by VPATForm to expose imperative actions (e.g., saveDraft) to parent components.
 * This mirrors the pattern used by other VPAT utilities (buildCodeToIdMap, getCriteriaDefaults, etc.),
 * centralizing the implementation and keeping the component lean.
 *
 * Responsibilities of saveDraft:
 * - Read current form values via getValues.
 * - Persist the VPAT title and description using updateVpat.mutateAsync.
 * - Iterate through criteria values, map sanitized codes back to WCAG codes, then to criterion IDs via idByCode.
 * - Persist each row using saveRow.mutateAsync, converting conformance to title case via camelToTitle and trimming values.
 * - Swallow individual errors to avoid breaking the whole save pass; callers can observe global errors if desired.
 */
export function buildVpatFormHandle(options: {
  getValues: () => {
    title?: string;
    description?: string | null;
    criteria?: Record<string, { conformance?: string; remarks?: string }>;
  };
  updateVpat: {
    mutateAsync: (payload: {
      title: string;
      description: string | null;
    }) => Promise<unknown>;
  };
  saveRow: {
    mutateAsync: (args: {
      criterionId: string;
      payload: { conformance: string | null; remarks: string | null };
    }) => Promise<unknown>;
  };
  idByCode: Map<string, string>;
  originalCriteria?: Record<string, { conformance?: string; remarks?: string }>;
}) {
  const { getValues, updateVpat, saveRow, idByCode, originalCriteria } =
    options;
  return {
    async saveDraft() {
      const values = getValues();
      // Update title/description first
      const title = (values.title || "").trim();
      const descriptionRaw = values.description ?? "";
      const description = descriptionRaw.trim();
      try {
        await updateVpat.mutateAsync({
          title,
          description: description.length > 0 ? description : null,
        });
      } catch (e) {
        // swallow here; caller can show global error if desired
        console.error("Failed to update VPAT header", e);
      }

      // Save only criteria that have changes compared to originalCriteria
      const entries = Object.entries(values.criteria || {});
      for (const [sanitizedCode, data] of entries) {
        const code = sanitizedCode.replace(/_/g, ".");
        const criterionId = idByCode.get(code);
        if (!criterionId) continue;
        const currentConformance = (data?.conformance || "").trim();
        const currentRemarks = (data?.remarks || "").trim();

        const original = originalCriteria?.[sanitizedCode] || {
          conformance: "",
          remarks: "",
        };
        const originalConformance = (original?.conformance || "").trim();
        const originalRemarks = (original?.remarks || "").trim();

        // Compare normalized values: conformance normalized to RHF internal, remarks trimmed
        const sameConformance =
          normalizeConformance(currentConformance) ===
          normalizeConformance(originalConformance);
        const sameRemarks = currentRemarks === originalRemarks;
        if (sameConformance && sameRemarks) {
          continue; // skip unchanged rows
        }

        try {
          await saveRow.mutateAsync({
            criterionId: criterionId,
            payload: {
              conformance:
                currentConformance.length > 0
                  ? camelToTitle(currentConformance)
                  : null,
              remarks: currentRemarks.length > 0 ? currentRemarks : null,
            },
          });
        } catch (e) {
          console.error(`Failed to save row for ${code}`, e);
        }
      }
    },
  } as { saveDraft: () => Promise<void> };
}
