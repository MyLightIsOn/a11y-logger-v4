import { severityEnum, statusEnum } from "@/lib/validation/issues";
import type { CreateIssueRequest, WcagVersion } from "@/types/issue";

export type Option = { value: string; label: string };

// Human-readable labels for enums
const severityLabels: Record<(typeof severityEnum)["_def"]["values"][number], string> = {
  "1": "Critical",
  "2": "High",
  "3": "Medium",
  "4": "Low",
};

const statusLabels: Record<(typeof statusEnum)["_def"]["values"][number], string> = {
  open: "Open",
  closed: "Closed",
  archive: "Archived",
};

/** Generic option builder for z.enum values with a label mapper. */
export function buildOptionsFromEnum<T extends readonly [string, ...string[]]>(
  values: T,
  labelFor: (v: T[number]) => string,
): ReadonlyArray<Option> {
  return values.map((v) => ({ value: v, label: labelFor(v) }));
}

/**
 * Option lists strictly derived from the schema enums, ensuring parity.
 */
export const severityOptions: ReadonlyArray<Option> = buildOptionsFromEnum(
  // severityEnum.options is typed as readonly string[]
  severityEnum.options as unknown as readonly [string, ...string[]],
  (v) => severityLabels[v as keyof typeof severityLabels],
);

export const statusOptions: ReadonlyArray<Option> = buildOptionsFromEnum(
  statusEnum.options as unknown as readonly [string, ...string[]],
  (v) => statusLabels[v as keyof typeof statusLabels],
);

/** Criteria key helpers: use a stable composite key version|code */
export function makeCriteriaKey(version: WcagVersion, code: string): string {
  return `${version}|${code}`;
}

export function parseCriteriaKey(key: string): { version: WcagVersion; code: string } {
  const [version, code] = key.split("|");
  // Narrow type cautiously; callers should ensure valid keys from trusted sources
  return { version: (version as WcagVersion) || ("2.2" as WcagVersion), code };
}

export function isCriteriaKey(key: string): boolean {
  const [version, code] = key.split("|");
  return (version === "2.1" || version === "2.2") && typeof code === "string" && code.length > 0;
}

/** Array dedupers */
export function dedupeStrings(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

export function dedupeBy<T, K extends string | number | symbol>(
  arr: T[],
  keyFn: (item: T) => K,
): T[] {
  const seen = new Set<K>();
  const out: T[] = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}

/**
 * Payload normalizer: shapes the CreateIssue request from raw form-like inputs.
 * It performs light trimming and empty-to-undefined conversions but defers
 * final validation and normalization to the schema (createIssueSchema).
 */
export function normalizeCreateIssuePayload(input: {
  title: string;
  description?: string;
  severity: string;
  status: string;
  suggested_fix?: string;
  impact?: string;
  url?: string;
  selector?: string;
  code_snippet?: string;
  screenshots?: string[];
  tag_ids?: string[];
  criteria: { version: WcagVersion; code: string }[];
}): CreateIssueRequest {
  const trim = (v?: string) => (typeof v === "string" ? v.trim() : v);
  const emptyToUndef = (v?: string) => {
    const t = trim(v);
    return t ? t : undefined;
  };

  return {
    title: (trim(input.title) || "").toString(),
    description: emptyToUndef(input.description),
    severity: input.severity as any,
    status: input.status as any,
    suggested_fix: emptyToUndef(input.suggested_fix),
    impact: emptyToUndef(input.impact),
    url: emptyToUndef(input.url),
    selector: emptyToUndef(input.selector),
    code_snippet: emptyToUndef(input.code_snippet),
    screenshots: input.screenshots && input.screenshots.length ? dedupeStrings(input.screenshots) : undefined,
    tag_ids: input.tag_ids && input.tag_ids.length ? dedupeStrings(input.tag_ids) : undefined,
    criteria: input.criteria,
  };
}
