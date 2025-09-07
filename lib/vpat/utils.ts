import { getWcagByCode, type CriteriaDetail } from "@/lib/wcag/reference";

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
