import { getWcagByCode, type CriteriaDetail } from "@/lib/wcag/reference";
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
export function sortCriteriaByCode<T extends { code: string }>(list: readonly T[]): T[] {
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
  const order: Record<"2.0" | "2.1" | "2.2", number> = { "2.0": 0, "2.1": 1, "2.2": 2 };
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
  const hasConformance = row.conformance !== null && row.conformance !== undefined;
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
