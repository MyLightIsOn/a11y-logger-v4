import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  useVpatDraftRows,
  useSaveVpatRow,
  useUpdateVpat,
  useVpatIssuesSummary,
  useGenerateVpatRowRemarks,
} from "@/lib/query/use-vpat-queries";
import { useWcagCriteria } from "@/lib/query/use-wcag-queries";
import IssuesDrawer, {
  type CriterionMeta,
} from "@/components/custom/vpat/IssuesDrawer";
import {
  getAllWcagCriteria,
  getCriteriaDefaults,
  getCodeById,
  buildCodeToIdMap,
  buildVpatFormHandle,
} from "@/lib/vpat/utils";
import { Sparkles, ClockFading } from "lucide-react";

function sanitizeKey(code: string) {
  // RHF uses dot-notation for nesting; replace dots with underscores in the field name
  return code.replace(/\./g, "_");
}

export type VpatFormHandle = {
  saveDraft: () => Promise<void>;
};

type FormValues = {
  title: string;
  description?: string;
  criteria: Record<string, { conformance?: string; remarks?: string }>;
};

import type { Vpat } from "@/types/vpat";

const VpatForm = forwardRef<VpatFormHandle, { vpat: Vpat | null | undefined }>(
  function VpatForm({ vpat }, ref) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerCriterion, setDrawerCriterion] =
      useState<CriterionMeta | null>(null);
    // UI: hide criteria with zero issues
    const [hideZeroIssues, setHideZeroIssues] = useState(false);
    const { data: draftRows } = useVpatDraftRows(vpat?.id ?? null);
    const { data: wcagCriteria } = useWcagCriteria();
    // Project-scoped issues summary for this VPAT
    const { data: issuesSummary } = useVpatIssuesSummary(vpat?.id ?? null);

    // Build maps for code lookups
    const codeById = useMemo(() => getCodeById(wcagCriteria), [wcagCriteria]);
    const idByCode = useMemo(
      () => buildCodeToIdMap(wcagCriteria),
      [wcagCriteria],
    );

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

    const { register, reset, getValues, setValue, formState } =
      useForm<FormValues>({
        defaultValues: {
          title: vpat?.title ?? "",
          description: vpat?.description ?? "",
          criteria: criteriaDefaults,
        },
      });

    const updateVpat = useUpdateVpat(vpat?.id ?? null);
    const saveRow = useSaveVpatRow(vpat!.id);
    const generateRowRemarks = useGenerateVpatRowRemarks(vpat!.id);
    const [busyCode, setBusyCode] = useState<string | null>(null);
    const [busyAll, setBusyAll] = useState(false);

    useImperativeHandle(ref, () =>
      buildVpatFormHandle({
        getValues,
        updateVpat,
        saveRow,
        idByCode,
        originalCriteria: criteriaDefaults,
      }),
    );

    const criteriaArray = getAllWcagCriteria();

    // Optionally filter out criteria with 0 issues (based on project-scoped summary)
    const filteredCriteriaArray = useMemo(() => {
      if (!hideZeroIssues) return criteriaArray;
      return criteriaArray.filter(
        (c) => (issuesCountByCode.get(c.code) ?? 0) > 0,
      );
    }, [criteriaArray, hideZeroIssues, issuesCountByCode]);

    // When vpat header or criteriaDefaults change, reset the form with the latest values.
    // To avoid blowing away in-progress user edits, only reset on the initial load
    // or when the form is not dirty.
    const didInit = useRef(false);

    useEffect(() => {
      if (!vpat) return;
      const nextValues = {
        title: vpat.title ?? "",
        description: vpat.description ?? "",
        criteria: criteriaDefaults,
      } as const;

      if (!didInit.current) {
        reset(nextValues);
        didInit.current = true;
        return;
      }

      if (!formState.isDirty) {
        reset(nextValues);
      }
    }, [vpat, criteriaDefaults, reset, formState.isDirty]);

    return (
      <div className={drawerOpen ? "pr-[34rem]" : undefined}>
        <form>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-card rounded-lg shadow-md border border-border mb-4">
            <div className="space-y-2">
              <Label htmlFor="vpat-title" className="block text-xl font-bold">
                Title<span className={"text-destructive"}>*</span>
              </Label>
              <Input id="vpat-title" {...register("title")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vpat-title" className="block text-xl font-bold">
                Description
              </Label>
              <Input id="vpat-description" {...register("description")} />
            </div>
          </div>

          <div>
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
                  Showing {filteredCriteriaArray.length} of{" "}
                  {criteriaArray.length}
                </div>
              </div>

              <Button
                variant="default"
                type="button"
                disabled={busyAll}
                aria-busy={busyAll}
                onClick={async () => {
                  try {
                    setBusyAll(true);
                    const values = getValues();
                    const targets = criteriaArray.filter((c) => {
                      const key = sanitizeKey(c.code);
                      const remarks = values?.criteria?.[key]?.remarks;
                      return !remarks || String(remarks).trim().length === 0;
                    });
                    for (const c of targets) {
                      const criterionId = idByCode.get(c.code);
                      if (!criterionId) continue;
                      try {
                        setBusyCode(c.code);
                        const res = await generateRowRemarks.mutateAsync({
                          criterionId,
                        });
                        const key = sanitizeKey(c.code);
                        const remarks = res?.remarks || "";
                        if (typeof remarks === "string") {
                          setValue(`criteria.${key}.remarks` as const, remarks);
                        }
                      } catch (e) {
                        console.error(
                          "Failed to generate remarks for",
                          c.code,
                          e,
                        );
                      } finally {
                        setBusyCode(null);
                      }
                    }
                  } finally {
                    setBusyAll(false);
                  }
                }}
                aria-label="Generate remarks for all empty criteria"
              >
                <Sparkles />
                {busyAll ? "Generating…" : "Generate All"}
              </Button>
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
                      <th className="p-3 w-[5rem] text-center whitespace-nowrap">
                        Generate Row
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const key = sanitizeKey(row.code);

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
                            <select
                              className="w-full border rounded px-3 py-3 bg-transparent"
                              {...register(
                                `criteria.${key}.conformance` as const,
                              )}
                            >
                              <option value="">Select…</option>
                              <option value="supports">Supports</option>
                              <option value="partiallySupports">
                                Partially supports
                              </option>
                              <option value="doesNotSupport">
                                Does not support
                              </option>
                              <option value="notApplicable">
                                Not applicable
                              </option>
                            </select>
                          </td>
                          <td className="p-3 align-top">
                            <Textarea
                              className="w-full border rounded px-2 py-1"
                              rows={3}
                              {...register(`criteria.${key}.remarks` as const)}
                            />
                          </td>
                          <td className="p-3 align-top text-center">
                            <button
                              type="button"
                              aria-label={`Open issues for ${row.code} ${row.name}`}
                              className="font-semibold text-2xl underline"
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
                          <td className="p-3 align-top text-center">
                            <Button
                              variant="default"
                              type="button"
                              disabled={busyCode === row.code}
                              aria-busy={busyCode === row.code}
                              onClick={async () => {
                                try {
                                  const criterionId = idByCode.get(row.code);
                                  if (!criterionId) return;
                                  setBusyCode(row.code);
                                  const res =
                                    await generateRowRemarks.mutateAsync({
                                      criterionId,
                                    });
                                  const key = sanitizeKey(row.code);
                                  const remarks = res?.remarks || "";
                                  if (typeof remarks === "string") {
                                    setValue(
                                      `criteria.${key}.remarks` as const,
                                      remarks,
                                    );
                                  }
                                } catch (e) {
                                  console.error(
                                    "Failed to generate remarks",
                                    e,
                                  );
                                } finally {
                                  setBusyCode(null);
                                }
                              }}
                            >
                              {busyCode === row.code ? (
                                <ClockFading />
                              ) : (
                                <Sparkles />
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </form>
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
  },
);

export default VpatForm;
