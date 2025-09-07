"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVpatDraft, useVpatDraftRows, useSaveVpatRow } from "@/lib/query/use-vpat-queries";
import { getAllWcagCriteria } from "@/lib/vpat/utils";
import { useWcagCriteria } from "@/lib/query/use-wcag-queries";
import type { UUID } from "@/types/common";
import type { ConformanceValue, VpatRowDraft } from "@/types/vpat";

const CONFORMANCE_OPTIONS: ConformanceValue[] = [
  "Supports",
  "Partially Supports",
  "Does Not Support",
  "Not Applicable",
  "Not Evaluated",
];

export default function VpatEditorSkeletonPage() {
  const params = useParams();
  const vpatIdParam = (params?.vpatId ?? null) as string | string[] | null;
  const vpatId = Array.isArray(vpatIdParam) ? (vpatIdParam[0] as UUID) : (vpatIdParam as UUID | null);

  const { data: vpat, isLoading, isError, error } = useVpatDraft(vpatId);

  // Local editable header fields (not persisted in this milestone)
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    if (vpat) {
      setTitle(vpat.title ?? "");
      setDescription(vpat.description ?? "");
    }
  }, [vpat]);

  // Fetch draft rows and WCAG criteria (with IDs)
  const { data: draftRows } = useVpatDraftRows(vpatId);
  const { data: wcagCriteria, isLoading: isLoadingCriteria, isError: isCriteriaError, error: criteriaError } = useWcagCriteria();

  // Build maps for quick access
  const draftByCriterionId = useMemo(() => {
    const map = new Map<string, VpatRowDraft>();
    for (const r of draftRows || []) map.set(r.wcag_criterion_id, r);
    return map;
  }, [draftRows]);

  type RowState = { conformance: ConformanceValue | null; remarks: string };
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [hydrated, setHydrated] = useState<boolean>(false);

  // Save row mutation
  const saveRowMutation = useSaveVpatRow(vpatId as UUID);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleSave = async (criterionId: string) => {
    if (!criterionId) return;
    const local = rowState[criterionId] ?? { conformance: null, remarks: "" };
    try {
      setSavingId(criterionId);
      await saveRowMutation.mutateAsync({
        criterionId: criterionId as UUID,
        payload: {
          conformance: local.conformance,
          remarks: local.remarks,
        },
      });
    } catch (e) {
      // surface error minimally now; richer toasts can be added later
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  const handleClear = (criterionId: string) => {
    handleChange(criterionId, { conformance: null, remarks: "" });
  };

  // Hydrate local state from persisted drafts once (or when drafts change if not yet edited)
  useEffect(() => {
    if (!hydrated && draftRows) {
      const next: Record<string, RowState> = {};
      for (const r of draftRows) {
        next[r.wcag_criterion_id] = {
          conformance: r.conformance ?? null,
          remarks: r.remarks ?? "",
        };
      }
      setRowState((prev) => ({ ...next, ...prev }));
      setHydrated(true);
    }
  }, [draftRows, hydrated]);

  const criteria = useMemo((): Array<{ id?: string; code: string; name: string; level: string }> => {
    // if API provided list not yet loaded, fall back to static for structure
    if (!wcagCriteria || wcagCriteria.length === 0) {
      return getAllWcagCriteria().map((c) => ({ code: c.code, name: c.name, level: c.level }));
    }
    // Some DBs store multiple versions per code; choose highest version per code
    const byCode = new Map<string, { id: string; code: string; name: string; level: string }>();
    for (const row of wcagCriteria) {
      const existing = byCode.get(row.code);
      if (!existing) {
        byCode.set(row.code, { id: row.id, code: row.code, name: row.name, level: row.level });
      } else {
        // Prefer AA/AAA? Keep latest by code occurrence; exact version selection isn't critical here
        byCode.set(row.code, { id: row.id, code: row.code, name: row.name, level: row.level });
      }
    }
    // Order by numeric code using util (reference sort)
    const sorted = getAllWcagCriteria();
    return sorted
      .filter((c) => byCode.has(c.code))
      .map((c) => {
        const base = byCode.get(c.code)!;
        return { id: base.id, code: c.code, name: base.name, level: base.level };
      });
  }, [wcagCriteria]);

  function getRowStatus(criterionId: string): "Empty" | "Drafted" | "Edited" {
    const persisted = draftByCriterionId.get(criterionId);
    const local = rowState[criterionId];
    const persistedConformance = persisted?.conformance ?? null;
    const persistedRemarks = persisted?.remarks ?? "";
    const localConformance = local?.conformance ?? null;
    const localRemarks = local?.remarks ?? "";

    const hasPersisted = (persistedConformance !== null) || (persistedRemarks.trim().length > 0);
    const hasLocal = (localConformance !== null) || (localRemarks.trim().length > 0);

    if (!hasPersisted && !hasLocal) return "Empty";
    if (persistedConformance === localConformance && persistedRemarks === localRemarks) return hasPersisted ? "Drafted" : "Empty";
    return "Edited";
  }

  const handleChange = (criterionId: string, patch: Partial<RowState>) => {
    setRowState((prev) => ({
      ...prev,
      [criterionId]: {
        conformance: prev[criterionId]?.conformance ?? null,
        remarks: prev[criterionId]?.remarks ?? "",
        ...patch,
      },
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">VPAT Editor</h1>
        {/* Toolbar placeholder (future: Publish / Generate Next 5) */}
        <div className="flex items-center gap-2" />
      </div>

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          {error?.message || "Failed to load VPAT"}
        </div>
      )}

      {isLoading && <div className="text-sm text-muted-foreground">Loading VPAT…</div>}

      {!isLoading && vpat && (
        <div className="space-y-6">
          {/* Header editable fields */}
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vpat-title">Title</Label>
                <Input id="vpat-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vpat-description">Description</Label>
                <Input
                  id="vpat-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="pt-1">
              <div className="text-sm text-muted-foreground">
                <strong>Scope</strong>: Placeholder summary (read-only). This will display WCAG scope details in later milestones.
              </div>
            </div>
          </div>

          {/* Criteria table */}
          <div className="rounded-lg border overflow-hidden">
            {isCriteriaError && (
              <div className="p-3 text-sm text-red-700 bg-red-50 border-b">{(criteriaError as Error)?.message || "Failed to load WCAG criteria"}</div>
            )}
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-3 w-[22rem]">Criterion</th>
                  <th className="p-3 w-[14rem]">Conformance</th>
                  <th className="p-3">Remarks</th>
                  <th className="p-3 w-[10rem]">Issues</th>
                  <th className="p-3 w-[18rem]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((c) => {
                  const cid = typeof c.id === "string" ? c.id : "";
                  const local = cid ? rowState[cid] : undefined;
                  const conformance = local?.conformance ?? null;
                  const remarks = local?.remarks ?? "";
                  const status = cid ? getRowStatus(cid) : "Empty";
                  return (
                    <tr key={`${c.code}-${cid || "noid"}`} className="border-t align-top">
                      <td className="p-3">
                        <div className="font-medium">{c.code} — {c.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>Level {c.level}</span>
                          <span aria-live="polite" className={
                            status === "Edited"
                              ? "text-amber-600"
                              : status === "Drafted"
                              ? "text-emerald-600"
                              : "text-muted-foreground"
                          }>
                            [{status}]
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Select
                          value={conformance ?? undefined}
                          onValueChange={(val) => cid && handleChange(cid, { conformance: val as ConformanceValue })}
                          disabled={!cid}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={cid ? "Select…" : "Loading…"} />
                          </SelectTrigger>
                          <SelectContent>
                            {CONFORMANCE_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <Textarea
                          placeholder="Add remarks…"
                          className="min-h-[3rem]"
                          value={remarks}
                          onChange={(e) => cid && handleChange(cid, { remarks: e.target.value })}
                          disabled={!cid}
                        />
                      </td>
                      <td className="p-3">
                        <div className="text-xs text-muted-foreground">—</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => cid && handleSave(cid)}
                            disabled={!cid || savingId === cid || status === "Drafted"}
                          >
                            {savingId === cid ? "Saving…" : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cid && handleClear(cid)}
                            disabled={!cid || (conformance === null && remarks === "")}
                          >
                            Clear
                          </Button>
                          <Button size="sm" variant="secondary" disabled title="Generation will be enabled in a later milestone">Generate</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {criteria.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-sm text-muted-foreground">
                      {isLoadingCriteria ? "Loading WCAG criteria…" : "No criteria available."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && !vpat && !isError && (
        <div className="text-sm text-muted-foreground">VPAT not found.</div>
      )}
    </div>
  );
}
