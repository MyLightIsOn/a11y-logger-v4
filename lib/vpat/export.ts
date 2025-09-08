import { compareWcagCodes } from "@/lib/vpat/utils";
import type { CriteriaDetail } from "@/lib/wcag/reference";
import type { ConformanceValue } from "@/types/vpat";

export type WcagScope = {
  versions: ("2.0" | "2.1" | "2.2")[];
  levels: { A: boolean; AA: boolean; AAA: boolean };
};

export type CriteriaRow = {
  code: string; // WCAG code e.g., "1.4.13"
  name: string; // short name of the criterion
  level: "A" | "AA" | "AAA";
  conformance: ConformanceValue;
  remarks?: string | null;
  issues?: { title?: string; url?: string }[] | null;
};

export type ToMarkdownInput = {
  title?: string;
  version_number?: number | null;
  published_at?: string | null; // ISO string
  wcag_scope: WcagScope;
  criteria_rows: CriteriaRow[];
};

/**
 * Render a deterministic Markdown for a VPAT snapshot.
 * - Includes a heading with title/version/published date (placeholders if missing)
 * - Renders three sections (A, AA, AAA) each with a table
 * - Rows are sorted numerically by WCAG code using compareWcagCodes
 */
export function toMarkdown(input: ToMarkdownInput): string {
  const title = (input.title || "VPAT").trim();
  const versionText = input.version_number != null ? `v${input.version_number}` : "vX";
  const publishedText = input.published_at ? new Date(input.published_at).toISOString() : "YYYY-MM-DD";

  // Prepare rows per level
  const rows = Array.isArray(input.criteria_rows) ? input.criteria_rows.slice() : [];
  rows.sort((a, b) => compareWcagCodes(a.code, b.code));

  const byLevel: Record<"A" | "AA" | "AAA", CriteriaRow[]> = { A: [], AA: [], AAA: [] };
  for (const r of rows) {
    if (r && (r.level === "A" || r.level === "AA" || r.level === "AAA")) {
      byLevel[r.level].push(r);
    }
  }

  const scopeLine = renderScope(input.wcag_scope);

  const parts: string[] = [];
  parts.push(`# ${escapeMdInline(title)} (${versionText})`);
  parts.push("");
  parts.push(`Published: ${publishedText}`);
  parts.push(scopeLine ? `Scope: ${scopeLine}` : "");
  parts.push("");

  parts.push(...renderLevelSection("A", byLevel.A));
  parts.push("");
  parts.push(...renderLevelSection("AA", byLevel.AA));
  parts.push("");
  parts.push(...renderLevelSection("AAA", byLevel.AAA));
  parts.push("");

  // Ensure trailing newline for deterministic output
  return parts.filter((p, i, arr) => !(p === "" && (i === 0 || arr[i - 1] === ""))).join("\n") + "\n";
}

function renderScope(scope: WcagScope | undefined): string {
  if (!scope) return "";
  const versions = Array.isArray(scope.versions) && scope.versions.length > 0 ? scope.versions.join(", ") : "2.2";
  const levels: string[] = [];
  if (scope.levels?.A) levels.push("A");
  if (scope.levels?.AA) levels.push("AA");
  if (scope.levels?.AAA) levels.push("AAA");
  const levelsText = levels.length ? levels.join("/") : "A/AA/AAA";
  return `WCAG ${versions} · Levels ${levelsText}`;
}

function renderLevelSection(level: "A" | "AA" | "AAA", rows: CriteriaRow[]): string[] {
  const out: string[] = [];
  out.push(`## WCAG Level ${level}`);
  out.push("");
  out.push("| Criterion | Conformance | Remarks/Explanation | Issues |");
  out.push("|---|---|---|---|");
  for (const r of rows) {
    const crit = `${escapeMdInline(r.code)} ${escapeMdInline(r.name)}`.trim();
    const conf = escapeMdInline(r.conformance);
    const remarks = escapeMdMultiline(r.remarks || "");
    const issues = (r.issues || [])
      .map((it) => formatIssue(it))
      .filter((s) => s.length > 0)
      .join("<br/>");
    out.push(`| ${crit} | ${conf} | ${remarks} | ${issues} |`);
  }
  if (rows.length === 0) {
    out.push("| _(no criteria)_ |  |  |  |");
  }
  return out;
}

function formatIssue(it: { title?: string; url?: string } | null | undefined): string {
  if (!it) return "";
  const title = (it.title || "").trim();
  const url = (it.url || "").trim();
  if (title && url) return `[${escapeMdInline(title)}](${escapeMdLink(url)})`;
  if (title) return escapeMdInline(title);
  if (url) return `<${escapeMdLink(url)}>`;
  return "";
}

// Minimal escaping to keep deterministic MD without heavy formatting libs
function escapeMdInline(s: string): string {
  return String(s).replace(/[|*_`\\]/g, (m) => `\\${m}`);
}

function escapeMdLink(s: string): string {
  return String(s).replace(/[()<>\\]/g, (m) => encodeURIComponent(m));
}

function escapeMdMultiline(s: string): string {
  const trimmed = (s || "").trim();
  if (!trimmed) return "";
  // Replace newlines with <br/> inside table cells to keep layout simple
  return escapeMdInline(trimmed).replace(/\n+/g, "<br/>");
}

export type { CriteriaDetail };
