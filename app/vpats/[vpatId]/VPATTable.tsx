import React, { useMemo, useState } from "react";
import {
  useVpatDraftRows,
  useVpatIssuesSummary,
} from "@/lib/query/use-vpat-queries";
import { useWcagCriteria } from "@/lib/query/use-wcag-queries";
import IssuesDrawer, {
  type CriterionMeta,
} from "@/components/custom/vpat/IssuesDrawer";
import {
  getAllWcagCriteria,
  getCriteriaDefaults,
  getCodeById,
} from "@/lib/vpat/utils";
import type { Vpat } from "@/types/vpat";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

function sanitizeKey(code: string) {
  // RHF used dot-notation for nesting; replace dots with underscores in the field name
  return code.replace(/\./g, "_");
}

type VPATTableProps = { vpat: Vpat | null | undefined };

function VPATTable({ vpat }: VPATTableProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCriterion, setDrawerCriterion] = useState<CriterionMeta | null>(
    null,
  );
  // UI: hide criteria with zero issues
  const [hideZeroIssues, setHideZeroIssues] = useState(false);
  const { data: draftRows } = useVpatDraftRows(vpat?.id ?? null);
  const { data: wcagCriteria } = useWcagCriteria();
  // Project-scoped issues summary for this VPAT
  const { data: issuesSummary } = useVpatIssuesSummary(vpat?.id ?? null);

  // Build maps for code lookups
  const codeById = useMemo(() => getCodeById(wcagCriteria), [wcagCriteria]);

  // Map WCAG code -> issue count from summary
  const issuesCountByCode = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of issuesSummary || []) {
      map.set(row.code, row.count);
    }
    return map;
  }, [issuesSummary]);

  // Compute criteria default values from DB rows when both datasets are available
  const criteriaDefaults = useMemo(
    () => getCriteriaDefaults(draftRows, codeById),
    [draftRows, codeById],
  );

  const criteriaArray = getAllWcagCriteria();

  // Optionally filter out criteria with 0 issues (based on project-scoped summary)
  const filteredCriteriaArray = useMemo(() => {
    if (!hideZeroIssues) return criteriaArray;
    return criteriaArray.filter(
      (c) => (issuesCountByCode.get(c.code) ?? 0) > 0,
    );
  }, [criteriaArray, hideZeroIssues, issuesCountByCode]);

  return (
    <div className={drawerOpen ? "pr-[34rem]" : undefined}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-card rounded-lg shadow-md border border-border mb-4">
        <div className="space-y-2">
          <h3 className="block text-xl font-bold">Title</h3>
          <h2>{vpat?.title}</h2>
        </div>

        <div className="space-y-2">
          <h3 className="block text-xl font-bold">Description</h3>
          <h2>{vpat?.description}</h2>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30 mb-4">
        <div className="flex items-center gap-2">
          <Switch
            id="toggle-hide-zero-issues"
            checked={hideZeroIssues}
            onCheckedChange={(v) => setHideZeroIssues(Boolean(v))}
            aria-label="Hide criteria with zero issues"
          />
          <Label htmlFor="toggle-hide-zero-issues" className="text-sm">
            Hide criteria with 0 issues
          </Label>

          <div className="text-xs text-muted-foreground">
            Showing {filteredCriteriaArray.length} of {criteriaArray.length}
          </div>
        </div>
      </div>

      {[
        { level: "A", label: "Table 1: Success Criteria, Level A" },
        { level: "AA", label: "Table 2: Success Criteria, Level AA" },
        { level: "AAA", label: "Table 3: Success Criteria, Level AAA" },
      ].map(({ level, label }) => {
        const rows = filteredCriteriaArray.filter(
          (row) => (row.level || "").toString().toUpperCase() === level,
        );
        return (
          <div
            key={level}
            className="bg-card rounded-lg shadow-md border border-border mb-4"
          >
            <table className="w-full border-collapse">
              <caption className="text-left font-semibold p-4 text-xl">
                {label}
              </caption>
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-3 w-[22rem]">Criterion</th>
                  <th className="p-3 w-[10rem]">Conformance</th>
                  <th className="p-3">Remarks</th>
                  <th className="p-3 w-[5rem] text-center">Issues</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const key = sanitizeKey(row.code);
                  const value = criteriaDefaults?.[key]?.conformance as
                    | "supports"
                    | "partiallySupports"
                    | "doesNotSupport"
                    | "notApplicable"
                    | undefined;
                  const labels: Record<string, string> = {
                    supports: "Supports",
                    partiallySupports: "Partially supports",
                    doesNotSupport: "Does not support",
                    notApplicable: "Not applicable",
                  };
                  const remarks = criteriaDefaults?.[key]?.remarks?.trim();
                  return (
                    <tr key={key} className="border-t">
                      <td className="p-3 align-top">
                        <div className="font-medium">
                          {row.code} - {row.name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>Level {row.level}</span>
                        </div>
                      </td>
                      <td className="p-3 align-top">
                        {value ? (
                          <span>{labels[value] ?? value}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 align-top">
                        {remarks ? (
                          <div className="whitespace-pre-wrap">{remarks}</div>
                        ) : (
                          <span className="text-muted-foreground">
                            No remarks
                          </span>
                        )}
                      </td>
                      <td className="p-3 align-top text-center">
                        <button
                          type="button"
                          aria-label={`Open issues for ${row.code} ${row.name}`}
                          className={`font-semibold text-2xl ${!issuesCountByCode.has(row.code) ? "" : "underline"}`}
                          disabled={!issuesCountByCode.has(row.code)}
                          onClick={() => {
                            setDrawerCriterion({
                              code: row.code,
                              name: row.name,
                              level: row.level,
                            });
                            setDrawerOpen(true);
                          }}
                        >
                          {issuesCountByCode.get(row.code) ?? 0}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
      <IssuesDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerCriterion(null);
        }}
        vpatId={vpat?.id ?? null}
        criterion={drawerCriterion}
      />
    </div>
  );
}

export default VPATTable;
