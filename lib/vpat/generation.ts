import type { UUID } from "@/types/common";
import type { ConformanceValue } from "@/types/vpat";
import type { IssueRead } from "@/types/issue";
import { getWcagByCode } from "@/lib/wcag/reference";
import { mapSeverityToBucket } from "@/lib/issues/constants";

export type GenerateForCriterionInput = {
  projectId: UUID; // kept for signature parity and future use; logic remains pure
  criterionCode: string; // e.g., "1.4.3"
  /**
   * Injected list of issues (already scoped to the project by the caller).
   * Required for pure determinism and testability.
   */
  issues: IssueRead[];
};

export type GenerateForCriterionResult = {
  conformance: ConformanceValue;
  remarks: string;
  related_issue_ids: UUID[];
  related_issue_urls: string[];
  /** Optional warning for UI surfacing (e.g., no mapped issues). */
  warning?: string;
};

/** Internal: pick up to N unique, truthy strings preserving first-seen order. */
function takeUnique(list: (string | undefined)[], n: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of list) {
    const t = (v || "").trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= n) break;
  }
  return out;
}

/** Internal: dedupe strings preserving order. */
function dedupe(list: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of list) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/**
 * Generate a suggested VPAT row for a given WCAG criterion by analyzing issues.
 * Pure function: depends only on input arguments; no network or globals.
 */
export function generateForCriterion(
  input: GenerateForCriterionInput,
): GenerateForCriterionResult {
  const { criterionCode } = input;
  const code = typeof criterionCode === "string" ? criterionCode.trim() : "";

  const ref = getWcagByCode();
  const criterion = ref.get(code);
  const criterionLabel = criterion
    ? `${criterion.code} ${criterion.name}`
    : code;

  // Filter relevant issues:
  // - status must be open
  // - mapped to this criterion via criteria or criteria_codes
  const relevant = (input.issues || []).filter((iss) => {
    if (!iss || iss.status !== "open") return false;
    const codesA = Array.isArray(iss.criteria_codes) ? iss.criteria_codes : [];
    const codesB = Array.isArray(iss.criteria)
      ? iss.criteria.map((c) => c.code)
      : [];
    const codes = new Set<string>(
      [...codesA, ...codesB].map((s) => (s || "").trim()),
    );
    return codes.has(code);
  });

  // Compute severity buckets
  let hasBlocking = false; // Critical/High present
  for (const iss of relevant) {
    const bucket = mapSeverityToBucket(iss.severity);
    if (bucket === "Critical" || bucket === "High") {
      hasBlocking = true;
      break;
    }
  }

  let conformance: ConformanceValue;
  if (relevant.length === 0) {
    // No mapped issues: assume Supports but warn caller to verify coverage.
    conformance = "Supports";
  } else if (hasBlocking) {
    conformance = "Does Not Support";
  } else {
    conformance = "Partially Supports";
  }

  // Build remarks (succinct, 2–5 sentences)
  const titles = takeUnique(
    relevant.map((r) => r.title),
    3,
  );

  const sentences: string[] = [];

  if (conformance === "Supports") {
    sentences.push(
      `Based on the current set of open issues, we did not identify functional barriers specific to ${criterionLabel}.`,
    );
    /*sentences.push(
      "This assessment is derived from mapped issues at the time of generation.",
    );*/
  } else if (conformance === "Partially Supports") {
    const count = relevant.length;
    const examples = titles.length
      ? ` Examples include: ${titles.join("; ")}.`
      : "";
    sentences.push(
      `${count} open issue${count === 1 ? "" : "s"} indicate minor limitations related to ${criterionLabel}.`,
    );
    sentences.push(
      `These may cause moderate friction for some users; remediation is recommended.${examples}`,
    );
  } else if (conformance === "Does Not Support") {
    const examples = titles.length ? ` Examples: ${titles.join("; ")}.` : "";
    sentences.push(
      `Blocking accessibility issues (Critical/High) are present for ${criterionLabel}.`,
    );
    sentences.push(
      `Users may be unable to complete key tasks until these issues are resolved.${examples}`,
    );
  } else {
    // Fallback for completeness; real logic above doesn't set Not Applicable here.
    sentences.push(
      `This criterion is not applicable to the product functionality.`,
    );
  }

  // Trim and cap sentences to 2–5
  const remarks = sentences
    .map((s) => s.trim())
    .filter((s) => !!s)
    .slice(0, 5)
    .join(" ");

  // Related IDs and URLs
  const related_issue_ids = dedupe(relevant.map((r) => r.id));
  const related_issue_urls = dedupe(
    relevant
      .map((r) => (typeof r.url === "string" ? r.url.trim() : ""))
      .filter((u) => !!u),
  );

  const result: GenerateForCriterionResult = {
    conformance,
    remarks,
    related_issue_ids,
    related_issue_urls,
  };

  if (relevant.length === 0) {
    result.warning = "No mapped issues found; verify coverage.";
  }

  return result;
}
