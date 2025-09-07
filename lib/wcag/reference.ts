import wcagList from "@/data/wcag-criteria.json";
import type { Principle, WcagLevel } from "@/lib/validation/report";
import { wcagLevelEnum } from "@/lib/validation/report";
import { wcagVersionEnum } from "@/lib/validation/issues";

// Local type for the JSON entry shape
export type WcagJsonEntry = {
  code: string;
  name: string;
  level: WcagLevel; // "A" | "AA" | "AAA"
  versions: string[]; // ["2.0","2.1","2.2"]
  principle: Principle;
};

export type CriteriaDetail = {
  code: string;
  name: string;
  level: WcagLevel;
  versions: ("2.0" | "2.1" | "2.2")[];
  principle: Principle;
};

// Cache holders
let _byCode: Map<string, CriteriaDetail> | null = null;

function buildByCode(): Map<string, CriteriaDetail> {
  const map = new Map<string, CriteriaDetail>();
  (wcagList as WcagJsonEntry[]).forEach((item) => {
    if (
      !item?.code ||
      !item?.name ||
      !item?.level ||
      !item?.versions ||
      !item?.principle
    )
      return;
    map.set(item.code, {
      code: item.code,
      name: item.name,
      level: item.level,
      versions: item.versions.filter(
        (v): v is "2.0" | "2.1" | "2.2" =>
          v === "2.0" || v === "2.1" || v === "2.2",
      ),
      principle: item.principle,
    });
  });
  return map;
}

/** Accessor for the code -> CriteriaDetail reference map (lazy built). */
export function getWcagByCode(): Map<string, CriteriaDetail> {
  if (!_byCode) _byCode = buildByCode();
  return _byCode;
}

/** Utility to pick the highest WCAG version from a list (defaults to "2.2" on empty/unknown). */
export function pickHighestVersion(
  versions: string[] | undefined,
): "2.0" | "2.1" | "2.2" {
  const allowed: ("2.0" | "2.1" | "2.2")[] = ["2.0", "2.1", "2.2"];
  const filtered = (versions || []).filter(
    (v): v is "2.0" | "2.1" | "2.2" =>
      v === "2.0" || v === "2.1" || v === "2.2",
  );
  if (filtered.length === 0) return "2.2";
  // Return the max by order
  return filtered.sort((a, b) => allowed.indexOf(a) - allowed.indexOf(b))[
    filtered.length - 1
  ];
}

/**
 * Convert an array of criterion codes (e.g., ["1.4.3","2.4.7"]) to detailed entries.
 * - Duplicates by code are removed.
 * - Unknown codes produce a graceful fallback item with a generic name.
 */
export function codesToCriteriaDetails(codes: string[]): CriteriaDetail[] {
  const byCode = getWcagByCode();
  const seen = new Set<string>();
  const out: CriteriaDetail[] = [];
  for (const raw of codes || []) {
    const code = typeof raw === "string" ? raw.trim() : "";
    if (!/^\d+\.\d+\.\d+$/.test(code)) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    const ref = byCode.get(code);
    if (ref) {
      out.push(ref);
    } else {
      // Missing code fallback: keep minimal sensible defaults
      out.push({
        code,
        name: `Unknown criterion ${code}`,
        level: wcagLevelEnum.Enum.AA,
        versions: [],
        principle: "Perceivable", // neutral choice; consumer shouldn't rely on this for unknowns
      } as CriteriaDetail);
    }
  }
  return out;
}

/** Input shapes accepted by normalizeCriteria */
export type CriteriaAggItem = {
  code: string;
  name?: string;
  level?: WcagLevel;
  versions?: ("2.0" | "2.1" | "2.2")[] | string[];
  principle?: Principle;
};

export type NormalizeCriteriaInput = {
  fromAgg?: CriteriaAggItem[] | null | undefined;
  fromCodes?: string[] | null | undefined;
};

export type WcagEntryNormalized = {
  version: "2.0" | "2.1" | "2.2";
  criterion: string; // code
  level: WcagLevel;
};

/**
 * Normalize criteria either from an aggregated object array or from a codes array
 * into the unified per-issue format: { version, criterion, level }[]
 *
 * Rules:
 * - Dedupe by criterion code
 * - Choose the highest version from versions[] if present; otherwise from reference; default "2.2" if still unknown
 * - Level comes from agg item, otherwise from reference; default to "AA" if unknown
 */
export function normalizeCriteria(
  input: NormalizeCriteriaInput,
): WcagEntryNormalized[] {
  const byCode = getWcagByCode();
  const seen = new Set<string>();
  const out: WcagEntryNormalized[] = [];

  const fromAgg = input.fromAgg || [];
  const fromCodes = input.fromCodes || [];

  const pushForCode = (
    code: string,
    levelHint?: WcagLevel,
    versionsHint?: string[] | undefined,
  ) => {
    if (!/^\d+\.\d+\.\d+$/.test(code)) return;
    if (seen.has(code)) return;
    seen.add(code);
    const ref = byCode.get(code);

    const versions =
      (versionsHint && Array.isArray(versionsHint)
        ? versionsHint
        : ref?.versions) || [];
    const version = pickHighestVersion(versions);

    const level = levelHint || ref?.level || wcagLevelEnum.Enum.AA;

    // Use enum to coerce/validate level just in case
    const safeLevel = wcagLevelEnum.parse(level);
    const safeVersion = wcagVersionEnum.parse(version);

    out.push({ version: safeVersion, criterion: code, level: safeLevel });
  };

  // Prefer fromAgg if provided
  for (const it of fromAgg) {
    if (!it || typeof it !== "object") continue;
    const code = (it.code || "").trim();
    if (!code) continue;
    pushForCode(
      code,
      it.level,
      Array.isArray(it.versions) ? (it.versions as string[]) : undefined,
    );
  }

  // Add any codes not covered by agg
  for (const raw of fromCodes) {
    const code = typeof raw === "string" ? raw.trim() : "";
    if (!code) continue;
    pushForCode(code);
  }

  return out;
}
