"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Loader from "@/components/custom/layout/loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useVpatDraft,
  useVpatDraftRows,
  useSaveVpatRow,
  useGenerateVpatRow,
  usePublishVpat,
  useUnpublishVpat,
  useUpdateVpat,
} from "@/lib/query/use-vpat-queries";
import { useVpatIssuesSummary } from "@/lib/query/use-vpat-queries";
import { getAllWcagCriteria } from "@/lib/vpat/utils";
import Link from "next/link";
import { useVpatIssuesByCriterion } from "@/lib/query/use-vpat-queries";
import {
  IssueHeader,
  CoreFieldsDisplay,
  AttachmentsDisplay,
} from "@/components/custom/issues/IssueDetailPage";
import { useIssueQuery } from "@/lib/query/use-issue-query";
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
  const vpatId = Array.isArray(vpatIdParam)
    ? (vpatIdParam[0] as UUID)
    : (vpatIdParam as UUID | null);

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
  const {
    data: wcagCriteria,
    isLoading: isLoadingCriteria,
    isError: isCriteriaError,
    error: criteriaError,
  } = useWcagCriteria();

  // Fetch project-scoped issues summary for this VPAT
  const { data: issuesSummary } = useVpatIssuesSummary(vpatId);

  // Build maps for quick access
  const draftByCriterionId = useMemo(() => {
    const map = new Map<string, VpatRowDraft>();
    for (const r of draftRows || []) map.set(r.wcag_criterion_id, r);
    return map;
  }, [draftRows]);

  // Map WCAG code -> count from issues summary
  const issuesCountByCode = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of issuesSummary || []) {
      map.set(row.code, row.count);
    }
    return map;
  }, [issuesSummary]);

  type RowState = { conformance: ConformanceValue | null; remarks: string };
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [hydrated, setHydrated] = useState<boolean>(false);

  // Save row mutation
  const saveRowMutation = useSaveVpatRow(vpatId as UUID);
  const generateRowMutation = useGenerateVpatRow(vpatId as UUID);
  const publishMutation = usePublishVpat(vpatId);
  const unpublishMutation = useUnpublishVpat(vpatId);
  const updateVpatMutation = useUpdateVpat(vpatId);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [rowWarnings, setRowWarnings] = useState<Record<string, string>>({});
  const [savingAll, setSavingAll] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);

  // Issues Drawer state
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerCriterion, setDrawerCriterion] = useState<{
    code: string;
    name: string;
    level: string | number;
  } | null>(null);
  const [slideIndex, setSlideIndex] = useState<number>(0);

  const selectedCode = drawerCriterion?.code ?? null;
  const { data: issuesForCode } = useVpatIssuesByCriterion(
    vpatId,
    selectedCode,
  );

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerCriterion(null);
    setSlideIndex(0);
  };
  const [dismissedWarnings, setDismissedWarnings] = useState<
    Record<string, boolean>
  >({});

  const validateRow = (row: RowState): { valid: boolean; message?: string } => {
    const conf = row.conformance;
    const remarks = (row.remarks || "").trim();
    // Rule 1: Not Applicable requires remarks
    if (conf === "Not Applicable" && remarks.length === 0) {
      return {
        valid: false,
        message: "Remarks are required when conformance is Not Applicable.",
      };
    }
    // Rule 2: If value != Supports, remarks required
    if (conf !== null && conf !== "Supports" && remarks.length === 0) {
      return {
        valid: false,
        message: "Remarks are required unless conformance is Supports.",
      };
    }
    return { valid: true };
  };

  const handleGenerate = async (criterionId: string) => {
    if (!criterionId) return;
    try {
      setGeneratingId(criterionId);
      const res = await generateRowMutation.mutateAsync({
        criterionId: criterionId as UUID,
      });
      // If the API returned a row, hydrate local state immediately
      if (res.row) {
        const next: RowState = {
          conformance: res.row.conformance ?? null,
          remarks: res.row.remarks ?? "",
        };
        setRowState((prev) => ({ ...prev, [criterionId]: next }));
        // Clear any validation error because generator returns a valid combination
        setRowErrors((prev) => ({ ...prev, [criterionId]: "" }));
      }
      // Surface non-blocking warning if present
      if (res.warning) {
        setRowWarnings((prev) => ({
          ...prev,
          [criterionId]: res.warning as string,
        }));
        setDismissedWarnings((prev) => ({ ...prev, [criterionId]: false }));
      }
      // For SKIPPED, we leave the content as-is per spec
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingId(null);
    }
  };

  const criteria = useMemo((): Array<{
    id?: string;
    code: string;
    name: string;
    level: string;
  }> => {
    // if API provided list not yet loaded, fall back to static for structure
    if (!wcagCriteria || wcagCriteria.length === 0) {
      return getAllWcagCriteria().map((c) => ({
        code: c.code,
        name: c.name,
        level: c.level,
      }));
    }
    // Some DBs store multiple versions per code; choose highest version per code
    const byCode = new Map<
      string,
      { id: string; code: string; name: string; level: string }
    >();
    for (const row of wcagCriteria) {
      const existing = byCode.get(row.code);
      if (!existing) {
        byCode.set(row.code, {
          id: row.id,
          code: row.code,
          name: row.name,
          level: row.level,
        });
      } else {
        // Prefer AA/AAA? Keep latest by code occurrence; exact version selection isn't critical here
        byCode.set(row.code, {
          id: row.id,
          code: row.code,
          name: row.name,
          level: row.level,
        });
      }
    }
    // Order by numeric code using util (reference sort)
    const sorted = getAllWcagCriteria();
    return sorted
      .filter((c) => byCode.has(c.code))
      .map((c) => {
        const base = byCode.get(c.code)!;
        return {
          id: base.id,
          code: c.code,
          name: base.name,
          level: base.level,
        };
      });
  }, [wcagCriteria]);

  // UI: hide criteria with zero issues
  const [hideZeroIssues, setHideZeroIssues] = useState<boolean>(false);
  const filteredCriteria = useMemo(() => {
    if (!hideZeroIssues) return criteria;
    return criteria.filter((c) => (issuesCountByCode.get(c.code) ?? 0) > 0);
  }, [criteria, issuesCountByCode, hideZeroIssues]);

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

  // Prefill Remarks with "Not Applicable" when there are 0 mapped issues and the row has no content yet.
  useEffect(() => {
    if (!hydrated) return;
    if (!criteria || criteria.length === 0) return;
    // Build map from WCAG code to criterionId (wcag_criterion_id)
    const codeToId = new Map<string, string>();
    for (const c of criteria) {
      if (c.id) codeToId.set(c.code, c.id);
    }
    const updates: Record<string, RowState> = {};
    for (const c of criteria) {
      const count = issuesCountByCode.get(c.code) ?? 0;
      const cid = c.id || "";
      if (!cid) continue;
      const current = rowState[cid];
      const hasContent = Boolean(
        (current?.conformance ?? null) !== null ||
          (current?.remarks || "").trim().length > 0,
      );
      if (count === 0 && !hasContent) {
        updates[cid] = { conformance: null, remarks: "Not Applicable" };
      }
    }
    if (Object.keys(updates).length > 0) {
      setRowState((prev) => ({ ...prev, ...updates }));
    }
  }, [hydrated, criteria, issuesCountByCode]);

  function getRowStatus(criterionId: string): "Empty" | "Drafted" | "Edited" {
    const persisted = draftByCriterionId.get(criterionId);
    const local = rowState[criterionId];
    const persistedConformance = persisted?.conformance ?? null;
    const persistedRemarks = persisted?.remarks ?? "";
    const localConformance = local?.conformance ?? null;
    const localRemarks = local?.remarks ?? "";

    const hasPersisted =
      persistedConformance !== null || persistedRemarks.trim().length > 0;
    const hasLocal =
      localConformance !== null || localRemarks.trim().length > 0;

    if (!hasPersisted && !hasLocal) return "Empty";
    if (
      persistedConformance === localConformance &&
      persistedRemarks === localRemarks
    )
      return hasPersisted ? "Drafted" : "Empty";
    return "Edited";
  }

  const handleChange = (criterionId: string, patch: Partial<RowState>) => {
    setRowState((prev) => {
      const nextRow: RowState = {
        conformance: prev[criterionId]?.conformance ?? null,
        remarks: prev[criterionId]?.remarks ?? "",
        ...patch,
      };
      // live-validate on change
      const v = validateRow(nextRow);
      setRowErrors((errs) => ({
        ...errs,
        [criterionId]: v.valid ? "" : v.message || "Invalid row",
      }));
      return {
        ...prev,
        [criterionId]: nextRow,
      };
    });
  };

  const isMetaDirty = vpat
    ? title !== vpat.title || (description ?? "") !== (vpat.description ?? "")
    : false;
  const dirtyRowIds = useMemo(() => {
    return (criteria || [])
      .map((c) => c.id)
      .filter((id): id is string => Boolean(id))
      .filter((id) => getRowStatus(id) === "Edited");
  }, [criteria, rowState, draftRows]);
  const canSaveAll =
    dirtyRowIds.length > 0 || (isMetaDirty && vpat?.status === "draft");

  const handleSaveAll = async () => {
    try {
      setSavingAll(true);
      // Save edited rows
      const tasks: Promise<unknown>[] = [];
      for (const id of dirtyRowIds) {
        const local = rowState[id] ?? { conformance: null, remarks: "" };
        const v = validateRow(local);
        if (!v.valid) {
          setRowErrors((prev) => ({
            ...prev,
            [id]: v.message || "Invalid row",
          }));
          continue;
        }
        tasks.push(
          saveRowMutation.mutateAsync({
            criterionId: id as UUID,
            payload: { conformance: local.conformance, remarks: local.remarks },
          }),
        );
      }
      // Update metadata if allowed and dirty
      if (vpat && vpat.status === "draft" && isMetaDirty) {
        tasks.push(updateVpatMutation.mutateAsync({ title, description }));
      }
      if (tasks.length > 0) {
        await Promise.allSettled(tasks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingAll(false);
    }
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      await publishMutation.mutateAsync();
    } catch (e) {
      console.error(e);
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    try {
      setPublishing(true);
      await unpublishMutation.mutateAsync();
    } catch (e) {
      console.error(e);
    } finally {
      setPublishing(false);
    }
  };

  const handleExportPdf = async () => {
    if (!vpat?.id) return;
    try {
      setExportingPdf(true);
      const res = await fetch(
        `/api/vpats/${encodeURIComponent(String(vpat.id))}/download?format=html`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );
      const html = await res.text();
      const win = window.open("", "_blank");
      if (!win) {
        console.error("Popup blocked. Please allow popups to export PDF.");
        return;
      }
      // Write the HTML into the new window and trigger print when styles load
      win.document.open();
      const printScript = `\n<script>\n  (function(){\n    function doPrint(){\n      try { window.focus(); window.print(); } catch(e){}\n    }\n    if (document.readyState === 'complete') {\n      setTimeout(doPrint, 150);\n    } else {\n      window.addEventListener('load', function(){ setTimeout(doPrint, 150); }, { once: true });\n    }\n  })();\n<\/script>`;
      win.document.write(html.replace(/<\/body>/i, `${printScript}</body>`));
      win.document.close();
    } catch (e) {
      console.error(e);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className={"p-6 space-y-6 " + (drawerOpen ? "pr-[34rem]" : "")}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">VPAT Editor</h1>
        {vpat && (
          <div className="flex items-center gap-2">
            {vpat.id && (
              <>
                <Button
                  variant="outline"
                  asChild
                  aria-label="Export HTML VPAT report"
                >
                  <a
                    href={`/api/vpats/${encodeURIComponent(String(vpat.id))}/download?format=html`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Export HTML
                  </a>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportPdf}
                  disabled={exportingPdf}
                  aria-label="Export PDF VPAT report"
                >
                  {exportingPdf ? "Exporting…" : "Export PDF"}
                </Button>
              </>
            )}
            <Button
              variant="default"
              onClick={handleSaveAll}
              disabled={!canSaveAll || savingAll}
              aria-label="Save all changes"
            >
              {savingAll ? "Saving…" : "Save"}
            </Button>
            {vpat.status === "published" ? (
              <Button
                variant="outline"
                onClick={handleUnpublish}
                disabled={publishing}
                aria-label="Unpublish VPAT"
              >
                {publishing ? "Working…" : "Unpublish"}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={handlePublish}
                disabled={publishing}
                aria-label="Publish VPAT"
              >
                {publishing ? "Publishing…" : "Publish"}
              </Button>
            )}
          </div>
        )}
      </div>

      {isError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {error?.message || "Failed to load VPAT"}
        </div>
      )}

      {isLoading && (
        <div className="text-sm text-muted-foreground">Loading VPAT…</div>
      )}

      {!isLoading && vpat && (
        <div className="space-y-6">
          {savingAll ? (
            <div
              className="rounded-lg border bg-card p-10 min-h-[50vh] flex items-center justify-center"
              role="status"
              aria-live="polite"
            >
              <Loader text="Saving VPAT…" />
            </div>
          ) : (
            <>
              {/* Header editable fields */}
              <div className="rounded-lg border bg-card p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vpat-title">Title</Label>
                    <Input
                      id="vpat-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
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
                    <span className={"font-bold"}>Scope</span>: Placeholder
                    summary (read-only). This will display WCAG scope details in
                    later milestones.
                  </div>
                </div>
              </div>

              {/* Criteria table */}
              <div className="rounded-lg border overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="toggle-hide-zero-issues"
                      checked={hideZeroIssues}
                      onCheckedChange={(v) => setHideZeroIssues(Boolean(v))}
                      aria-label="Hide criteria with zero issues"
                    />
                    <Label
                      htmlFor="toggle-hide-zero-issues"
                      className="text-sm"
                    >
                      Hide criteria with 0 issues
                    </Label>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Showing {filteredCriteria.length} of {criteria.length}
                  </div>
                </div>
                {isCriteriaError && (
                  <div className="p-3 text-sm text-red-700 bg-red-50 border-b">
                    {(criteriaError as Error)?.message ||
                      "Failed to load WCAG criteria"}
                  </div>
                )}
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-3 w-[22rem]">Criterion</th>
                      <th className="p-3 w-[10rem]">Conformance</th>
                      <th className="p-3">Remarks</th>
                      <th className="p-3 w-[5rem] text-center">Issues</th>
                      <th className="p-3 w-[5rem] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCriteria.map((c) => {
                      const cid = typeof c.id === "string" ? c.id : "";
                      const local = cid ? rowState[cid] : undefined;
                      const conformance = local?.conformance ?? null;
                      const remarks = local?.remarks ?? "";
                      const status = cid ? getRowStatus(cid) : "Empty";
                      const errorMsg = cid ? rowErrors[cid] || "" : "";
                      return (
                        <tr
                          key={`${c.code}-${cid || "noid"}`}
                          className="border-t align-top"
                        >
                          <td className="p-3">
                            <div className="font-medium">
                              {c.code} — {c.name}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>Level {c.level}</span>
                              <span
                                aria-live="polite"
                                className={
                                  status === "Edited"
                                    ? "text-amber-600"
                                    : status === "Drafted"
                                      ? "text-emerald-600"
                                      : "text-muted-foreground"
                                }
                              >
                                [{status}]
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Select
                              value={conformance ?? undefined}
                              onValueChange={(val) =>
                                cid &&
                                handleChange(cid, {
                                  conformance: val as ConformanceValue,
                                })
                              }
                              disabled={!cid}
                            >
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={cid ? "Select…" : "Loading…"}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {CONFORMANCE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              <Textarea
                                placeholder="Add remarks…"
                                className={`min-h-[200px] ${errorMsg ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                aria-invalid={!!errorMsg}
                                aria-describedby={
                                  errorMsg ? `${cid}-remarks-error` : undefined
                                }
                                value={remarks}
                                onChange={(e) =>
                                  cid &&
                                  handleChange(cid, { remarks: e.target.value })
                                }
                                disabled={!cid}
                              />
                              {errorMsg && (
                                <p
                                  id={`${cid}-remarks-error`}
                                  className="text-xs text-red-600"
                                >
                                  {errorMsg}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <button
                              className={
                                "text-2xl text-center font-semibold flex items-center justify-center gap-2 w-full min-h-full underline"
                              }
                              onClick={() => {
                                setDrawerCriterion({
                                  code: c.code,
                                  name: c.name,
                                  level: c.level,
                                });
                                setDrawerOpen(true);
                                setSlideIndex(0);
                              }}
                              aria-label={`Open issues for ${c.code} ${c.name}`}
                            >
                              {issuesCountByCode.get(c.code) ?? 0}
                            </button>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-2 flex items-center justify-center">
                              {cid &&
                                rowWarnings[cid] &&
                                !dismissedWarnings[cid] && (
                                  <div
                                    className="rounded border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2 text-xs flex items-start justify-between gap-3"
                                    role="status"
                                    aria-live="polite"
                                  >
                                    <span>{rowWarnings[cid]}</span>
                                    <button
                                      type="button"
                                      className="text-amber-900/70 hover:text-amber-900"
                                      aria-label="Dismiss warning"
                                      onClick={() =>
                                        setDismissedWarnings((prev) => ({
                                          ...prev,
                                          [cid]: true,
                                        }))
                                      }
                                    >
                                      ×
                                    </button>
                                  </div>
                                )}
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => cid && handleGenerate(cid)}
                                  disabled={!cid || generatingId === cid}
                                  aria-label={
                                    cid
                                      ? `Generate remarks for ${c.code}`
                                      : "Generate"
                                  }
                                >
                                  {generatingId === cid
                                    ? "Generating…"
                                    : "Generate"}
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredCriteria.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-4 text-sm text-muted-foreground"
                        >
                          {isLoadingCriteria
                            ? "Loading WCAG criteria…"
                            : hideZeroIssues
                              ? "No criteria with issues to display."
                              : "No criteria available."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {!isLoading && !vpat && !isError && (
        <div className="text-sm text-muted-foreground">VPAT not found.</div>
      )}

      {drawerOpen && drawerCriterion && (
        <aside
          className="fixed top-0 right-0 h-full w-[34rem] bg-white dark:bg-card border-l border-border shadow-xl z-30 overflow-y-auto"
          aria-label="Issues drawer"
        >
          <div className="p-4 border-b border-border sticky top-0 bg-white dark:bg-card z-10">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {drawerCriterion.code} — {drawerCriterion.name} Issues
                </h2>
                <p className="text-xs text-muted-foreground">
                  Level {drawerCriterion.level}
                </p>
              </div>
              <button
                className="text-sm underline"
                onClick={closeDrawer}
                aria-label="Close issues drawer"
              >
                Close
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-muted-foreground">
                {issuesForCode?.length ?? 0} issue
                {(issuesForCode?.length ?? 0) === 1 ? "" : "s"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 border rounded disabled:opacity-50"
                  onClick={() => setSlideIndex((idx) => Math.max(0, idx - 1))}
                  disabled={
                    !issuesForCode ||
                    issuesForCode.length === 0 ||
                    slideIndex === 0
                  }
                  aria-label="Previous issue"
                >
                  Prev
                </button>
                <span className="text-xs">
                  {issuesForCode && issuesForCode.length > 0
                    ? `${slideIndex + 1} / ${issuesForCode.length}`
                    : "0 / 0"}
                </span>
                <button
                  className="px-2 py-1 border rounded disabled:opacity-50"
                  onClick={() =>
                    setSlideIndex((idx) =>
                      !issuesForCode
                        ? 0
                        : Math.min(issuesForCode.length - 1, idx + 1),
                    )
                  }
                  disabled={
                    !issuesForCode ||
                    issuesForCode.length === 0 ||
                    (issuesForCode
                      ? slideIndex >= issuesForCode.length - 1
                      : true)
                  }
                  aria-label="Next issue"
                >
                  Next
                </button>
              </div>
            </div>

            {issuesForCode && issuesForCode.length > 0 ? (
              <IssueSlide issueId={issuesForCode[slideIndex]} />
            ) : (
              <div className="text-sm text-muted-foreground">
                No issues for this criterion.
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

// Lightweight slide component reusing Issue Detail sections
function IssueSlide({ issueId }: { issueId: string }) {
  const { data, isLoading, error } = useIssueQuery({
    id: issueId,
    includeCriteria: true,
  });

  if (isLoading)
    return <div className="text-sm text-muted-foreground">Loading issue…</div>;
  if (error || !data)
    return <div className="text-sm text-red-600">Failed to load issue.</div>;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/issues/${data.id}`}
          className="underline text-base font-medium"
        >
          {data.title}
        </Link>
        <div className="mt-2">
          <IssueHeader
            title={data.title}
            severity={data.severity}
            status={data.status}
          />
        </div>
      </div>
      <CoreFieldsDisplay
        description={data.description}
        url={data.url}
        impact={data.impact}
        suggestedFix={data.suggested_fix}
        selector={data.selector}
        codeSnippet={data.code_snippet}
      />
      <AttachmentsDisplay screenshots={data.screenshots} />
    </div>
  );
}
