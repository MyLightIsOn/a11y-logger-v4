import React, { useMemo } from "react";
import {
  useVpatDraftRows,
} from "@/lib/query/use-vpat-queries";
import { useWcagCriteria } from "@/lib/query/use-wcag-queries";
import {
  getAllWcagCriteria,
  getCriteriaDefaults,
  getCodeById,
} from "@/lib/vpat/utils";
import type { Vpat } from "@/types/vpat";

function sanitizeKey(code: string) {
  // RHF used dot-notation for nesting; replace dots with underscores in the field name
  return code.replace(/\./g, "_");
}

type VPATTableProps = { vpat: Vpat | null | undefined };

function VPATTable({ vpat }: VPATTableProps) {
  const { data: draftRows } = useVpatDraftRows(vpat?.id ?? null);
  const { data: wcagCriteria } = useWcagCriteria();

  // Build maps for code lookups
  const codeById = useMemo(() => getCodeById(wcagCriteria), [wcagCriteria]);

  // Compute criteria default values from DB rows when both datasets are available
  const criteriaDefaults = useMemo(
    () => getCriteriaDefaults(draftRows, codeById),
    [draftRows, codeById],
  );

  const criteriaArray = getAllWcagCriteria();

  return (
    <div>
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

      {[
        { level: "A", label: "Table 1: Success Criteria, Level A" },
        { level: "AA", label: "Table 2: Success Criteria, Level AA" },
        { level: "AAA", label: "Table 3: Success Criteria, Level AAA" },
      ].map(({ level, label }) => {
        const rows = criteriaArray.filter(
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
                  <th className="p-3 w-[40%]">Criterion</th>
                  <th className="p-3 w-[10%]">Conformance</th>
                  <th className="p-3 w-[30%]">Remarks</th>
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
                      {null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export default VPATTable;
