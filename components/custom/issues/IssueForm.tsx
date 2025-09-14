"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { CreateIssueInput } from "@/lib/validation/issues";
import { useRouter, useSearchParams } from "next/navigation";
import type { CreateIssueRequest, IssueRead, WcagVersion } from "@/types/issue";
import type { IssueStatus, Severity } from "@/types/common";
import { useTagsQuery } from "@/lib/query/use-tags-query";
import { useCreateIssueMutation } from "@/lib/query/use-create-issue-mutation";
import { useUpdateIssueMutation } from "@/lib/query/use-update-issue-mutation";
import AIAssistPanel from "@/components/custom/issues/AIAssistPanel";
import CoreFields from "@/components/custom/issues/CoreFields";
import { Button } from "@/components/ui/button";
import TagsSection from "@/components/custom/issues/TagsSection";
import AttachmentsSection from "@/components/custom/issues/AttachmentsSection";
import FormActions from "@/components/custom/issues/FormActions";
import {
  useAiAssist,
  applyAiSuggestionsNonDestructive,
} from "@/lib/hooks/use-ai-assist";
import { useFileUploads } from "@/lib/hooks/use-file-uploads";
import { useAssessmentsQuery } from "@/lib/query/use-assessments-query";
import { WcagCriteriaSection } from "@/components/custom/issues/WcagCriteriaSection";
import { useWcagCriteriaQuery } from "@/lib/query/use-wcag-criteria-query";
import { parseCriteriaKey, dedupeStrings, statusOptions } from "@/lib/issues/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

export interface IssueFormProps {
  mode?: "create" | "edit";
  issueId?: string; // required when mode = "edit"
  initialData?: IssueRead; // optional pre-population data in edit mode
}

export function IssueForm({
  mode = "create",
  issueId,
  initialData,
}: IssueFormProps) {
  const {
    handleSubmit: rhfHandleSubmit,
    formState: { errors },
    setValue,
    clearErrors,
    reset,
    control,
  } = useForm<CreateIssueInput>({
    defaultValues: {
      title: "",
      description: "",
      severity: "3",
      status: "open",
      suggested_fix: "",
      impact: "",
      url: "",
      selector: "",
      code_snippet: "",
      screenshots: [],
      tag_ids: [],
      criteria: [],
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });
  const [
    title,
    description,
    severity,
    status,
    suggestedFix,
    impact,
    url,
    selector,
    codeSnippet,
    screenshots,
    tagIds,
  ] = useWatch({
    control,
    name: [
      "title",
      "description",
      "severity",
      "status",
      "suggested_fix",
      "impact",
      "url",
      "selector",
      "code_snippet",
      "screenshots",
      "tag_ids",
    ],
  }) as unknown as [
    string,
    string | undefined,
    Severity,
    IssueStatus,
    string | undefined,
    string | undefined,
    string | undefined,
    string | undefined,
    string | undefined,
    string[],
    string[],
  ];

  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentIdFromUrl = searchParams?.get("assessment_id") || "";
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [criteriaCodes, setCriteriaCodes] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagesToRemove, setImagesToRemove] = useState<string[]>([]);
  const [showAssessmentChangeConfirm, setShowAssessmentChangeConfirm] =
    useState<boolean>(false);
  const [pendingAssessmentId, setPendingAssessmentId] = useState<string>("");

  // Unsaved changes navigation guard state
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Load assessments to resolve the selected assessment's WCAG version for AI context
  const { data: assessments = [] } = useAssessmentsQuery();

  // Current effective assessment context:
  // - In edit mode, use the issue's existing linked assessment (read-only, from join)
  // - In create mode, URL param wins (locked), otherwise local selection
  const assessmentIdFromInitial = initialData?.assessment?.id || "";
  const effectiveAssessmentId =
    mode === "edit"
      ? assessmentIdFromInitial
      : assessmentIdFromUrl || selectedAssessmentId || "";
  const assessment = useMemo(
    () => assessments.find((a) => a.id === effectiveAssessmentId),
    [assessments, effectiveAssessmentId],
  );
  const wcagVersionForAi = assessment?.wcag_version as WcagVersion | undefined;

  // Load full criteria catalog and filter by the assessment's version
  const {
    data: allCriteria = [],
    isLoading: wcagLoading,
    error: wcagError,
  } = useWcagCriteriaQuery();

  // Determine an effective WCAG version to power the criteria selector:
  // - Prefer the selected Assessment's version
  // - Fallback to the version from existing criteria (edit mode)
  const inferredVersionFromCriteria: WcagVersion | undefined = useMemo(() => {
    // Try initialData.criteria first
    const v1 = initialData?.criteria?.[0]?.version as WcagVersion | undefined;
    if (v1) return v1;
    // Then try currently selected criteria codes (version|code)
    if (criteriaCodes && criteriaCodes.length > 0) {
      const { version } = parseCriteriaKey(criteriaCodes[0]);
      return version as WcagVersion;
    }
    return undefined;
  }, [initialData?.criteria, criteriaCodes]);

  const effectiveWcagVersion =
    (assessment?.wcag_version as WcagVersion | undefined) ||
    (initialData?.assessment?.wcag_version as WcagVersion | undefined) ||
    inferredVersionFromCriteria;

  const wcagOptions = useMemo(() => {
    if (!effectiveWcagVersion) return [];
    const v = effectiveWcagVersion as WcagVersion;
    const dotAware = (a: string, b: string) => {
      const pa = a.split(".").map(Number);
      const pb = b.split(".").map(Number);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const da = pa[i] ?? 0;
        const db = pb[i] ?? 0;
        if (da !== db) return da - db;
      }
      return 0;
    };
    return (allCriteria || [])
      .filter((c) => c.version === v)
      .sort((c1, c2) => dotAware(c1.code, c2.code))
      .map((c) => ({
        value: `${c.version}|${c.code}`,
        label: `${c.code} — ${c.name} (${c.level})`,
      }));
  }, [allCriteria, effectiveWcagVersion]);

  const createIssue = useCreateIssueMutation();
  const updateIssue = useUpdateIssueMutation();

  // Uploads via hook (declared early so other logic can reference its state)
  const {
    filesToUpload,
    setFilesToUpload,
    uploading,
    uploadError,
    uploadedUrls,
    upload,
  } = useFileUploads({
    folder: "a11y-logger/issues",
    onUploaded: (urls) => setScreenshots(urls),
  });

  // Determine if there are unsaved changes (custom, reliable for create/edit)
  const isDirty = React.useMemo(() => {
    // Normalize helpers
    const norm = (v?: string | null) => (v ?? "").trim();
    const arrEq = (a: string[] = [], b: string[] = []) => {
      if (a.length !== b.length) return false;
      const as = [...a].sort();
      const bs = [...b].sort();
      for (let i = 0; i < as.length; i++) if (as[i] !== bs[i]) return false;
      return true;
    };

    const anyUploads = (filesToUpload && filesToUpload.length > 0) ||
      (uploadedUrls && uploadedUrls.length > 0);

    if (mode === "create") {
      const anyText =
        norm(title) || norm(description) || norm(suggestedFix) || norm(impact) ||
        norm(url) || norm(selector) || norm(codeSnippet);
      const severityChanged = severity !== "3"; // default is 3
      const tagsChanged = (tagIds?.length ?? 0) > 0;
      const criteriaChanged = (criteriaCodes?.length ?? 0) > 0;
      return Boolean(
        anyText || severityChanged || tagsChanged || criteriaChanged || anyUploads,
      );
    }

    // edit mode
    const init = initialData;
    if (!init) return false;

    const titleChanged = norm(title) !== norm(init.title);
    const descChanged = norm(description) !== norm(init.description);
    const sevChanged = severity !== (init.severity as Severity);
    const fixChanged = norm(suggestedFix) !== norm(init.suggested_fix);
    const impactChanged = norm(impact) !== norm(init.impact);
    const urlChanged = norm(url) !== norm(init.url);
    const selectorChanged = norm(selector) !== norm(init.selector);
    const codeChanged = norm(codeSnippet) !== norm(init.code_snippet);

    const initTagIds = Array.isArray(init.tags) ? init.tags.map((t) => t.id) : [];
    const tagsChanged = !arrEq(tagIds || [], initTagIds);

    const initCriteriaCodes = Array.isArray(init.criteria)
      ? init.criteria.map((c) => `${c.version}|${c.code}`)
      : Array.isArray(init.criteria_codes)
        ? init.criteria_codes
        : [];
    const criteriaChanged = !arrEq(criteriaCodes || [], initCriteriaCodes);

    const removedChanged = (imagesToRemove?.length ?? 0) > 0;
    const imagesChanged = removedChanged || anyUploads;

    return (
      titleChanged || descChanged || sevChanged || fixChanged || impactChanged ||
      urlChanged || selectorChanged || codeChanged || tagsChanged || criteriaChanged || imagesChanged
    );
  }, [mode, title, description, suggestedFix, impact, url, selector, codeSnippet, severity, tagIds, criteriaCodes, filesToUpload, uploadedUrls, existingImages, imagesToRemove, initialData]);

  const isSubmitting = (mode === "edit" ? updateIssue.isPending : createIssue.isPending) || uploading;

  // Warn on unload (refresh, closing tab, typing URL) when there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSubmitting) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, isSubmitting]);

  // Intercept in-app link clicks to confirm navigation when dirty
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!isDirty || isSubmitting) return;
      // Ignore modified clicks
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      // Only intercept same-origin, same-tab navigations
      const href = anchor.getAttribute('href');
      if (!href) return;
      const url = new URL(anchor.href, window.location.href);
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (url.origin !== window.location.origin) return;
      // At this point, block and show modal
      e.preventDefault();
      setPendingHref(url.toString());
      setShowUnsavedConfirm(true);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [isDirty, isSubmitting]);

  // Pre-populate when in edit mode and initialData is provided
  useEffect(() => {
    if (!initialData) return;
    // Core fields
    setValue("title", initialData.title ?? "", { shouldValidate: false });
    setValue("description", initialData.description ?? "", {
      shouldValidate: false,
    });
    setValue("severity", initialData.severity as Severity, {
      shouldValidate: false,
    });
    setValue("suggested_fix", initialData.suggested_fix ?? "", {
      shouldValidate: false,
    });
    setValue("impact", initialData.impact ?? "", { shouldValidate: false });
    setValue("url", initialData.url ?? "", { shouldValidate: false });
    setValue("selector", initialData.selector ?? "", { shouldValidate: false });
    setValue("code_snippet", initialData.code_snippet ?? "", {
      shouldValidate: false,
    });
    setValue("status", (initialData.status as IssueStatus) ?? "open", { shouldValidate: false });

    if (mode === "edit") {
      // In edit mode, store existing images separately for enhanced image management
      const existing = Array.isArray(initialData.screenshots)
        ? initialData.screenshots
        : [];
      setExistingImages(existing);
      setImagesToRemove([]);
      // Do not populate form screenshots with existing; new uploads will appear there
      setValue("screenshots", [], { shouldValidate: false });
    } else {
      // In create mode (or fallback), keep previous behavior
      setValue(
        "screenshots",
        Array.isArray(initialData.screenshots) ? initialData.screenshots : [],
        { shouldValidate: false },
      );
    }

    // Tags -> tag_ids
    const tagIdsInit = Array.isArray(initialData.tags)
      ? initialData.tags.map((t) => t.id)
      : [];
    setValue("tag_ids", tagIdsInit, { shouldValidate: false });
    // Criteria codes state
    const codes = Array.isArray(initialData.criteria)
      ? initialData.criteria.map((c) => `${c.version}|${c.code}`)
      : Array.isArray(initialData.criteria_codes)
        ? initialData.criteria_codes
        : [];
    setCriteriaCodes(codes);
  }, [initialData, mode, setValue]);

  const setTitle = (v: string) =>
    setValue("title", v, { shouldValidate: false });
  const setDescription = (v: string) =>
    setValue("description", v, { shouldValidate: false });
  const setSeverity = (v: Severity) =>
    setValue("severity", v, { shouldValidate: false });
  const setSeverityFromString = (v: string) => {
    // Guard against invalid/falsy values that could clear the Select inadvertently
    if (v === "1" || v === "2" || v === "3" || v === "4") {
      setSeverity(v as Severity);
    }
    // Ignore anything else (keeps current severity stable)
  };
  const setStatusFromString = (v: string) => {
      if (v === "open" || v === "closed" || v === "archive") {
        setValue("status", v as IssueStatus, { shouldValidate: false });
      }
    };
  const setSuggestedFix = (v: string) =>
    setValue("suggested_fix", v, { shouldValidate: false });
  const setImpact = (v: string) =>
    setValue("impact", v, { shouldValidate: false });
  const setUrl = (v: string) => setValue("url", v, { shouldValidate: false });
  const setSelector = (v: string) =>
    setValue("selector", v, { shouldValidate: false });
  const setCodeSnippet = (v: string) =>
    setValue("code_snippet", v, { shouldValidate: false });
  const setScreenshots = (arr: string[]) =>
    setValue("screenshots", arr, { shouldValidate: false });
  const setTagIds = (arr: string[]) =>
    setValue("tag_ids", arr, { shouldValidate: false });

  const {
    data: tagsData = [],
    isLoading: tagsLoading,
    error: tagsError,
  } = useTagsQuery();

  const tagOptions = useMemo(
    () => (tagsData || []).map((t) => ({ value: t.id, label: t.label })),
    [tagsData],
  );

  // AI Assist via hook
  const { aiPrompt, setAiPrompt, aiBusy, generate } = useAiAssist({
    getContext: () => ({
      description: aiPrompt || description || "",
      url: url || undefined,
      selector: selector || undefined,
      code_snippet: codeSnippet || undefined,
      screenshots: screenshots && screenshots.length ? screenshots : undefined,
      tags: tagIds && tagIds.length ? tagIds : undefined,
      severity_hint: severity,
      assessment_id: effectiveAssessmentId || undefined,
      wcag_version: wcagVersionForAi,
    }),
    applySuggestions: (json) =>
      applyAiSuggestionsNonDestructive(json, {
        current: {
          title,
          description,
          suggested_fix: suggestedFix,
          impact,
          severity: severity,
          criteriaKeys: criteriaCodes,
        },
        set: {
          setTitle,
          setDescription,
          setSuggestedFix,
          setImpact,
          setSeverity: setSeverityFromString,
          setCriteriaKeys: setCriteriaCodes,
        },
      }),
  });

  const handleAiAssist = (e: React.FormEvent) => {
    e.preventDefault();
    void generate();
  };

  const onSubmitRHF = async () => {
    clearErrors();

    // If there are files queued, upload them first so screenshots are included in a single action
    let uploadResult: string[] | undefined = undefined;
    if (filesToUpload && filesToUpload.length > 0) {
      uploadResult = await upload();
      // If upload failed, abort submit and surface error via FormActions
      if (uploadError) {
        return;
      }
      // Update form state as well for UI consistency
      if (uploadResult && uploadResult.length) {
        setScreenshots(uploadResult);
      }
    }

    // Prefer immediate result from upload(), then hook state uploadedUrls, then form screenshots
    const latestScreenshots =
      (uploadResult && uploadResult.length
        ? uploadResult
        : uploadedUrls && uploadedUrls.length
          ? uploadedUrls
          : screenshots) || [];

    if (mode === "edit") {
      if (!issueId) {
        setLocalError("Missing issue ID for edit mode.");
        return;
      }

      // Enhanced Image Management: combine kept existing + newly uploaded
      const keptExisting = existingImages.filter(
        (u) => !imagesToRemove.includes(u),
      );
      const newUploaded =
        (uploadResult && uploadResult.length
          ? uploadResult
          : uploadedUrls && uploadedUrls.length
            ? uploadedUrls
            : screenshots) || [];
      const combinedScreenshots = dedupeStrings([
        ...keptExisting,
        ...newUploaded,
      ]);

      // Build Update payload: only include fields we currently edit
      const updatePayload = {
        title: (title || "").trim() || undefined,
        description: (description || "").trim() || undefined,
        severity: severity || undefined,
        status: status || undefined,
        suggested_fix: (suggestedFix || "").trim() || undefined,
        impact: (impact || "").trim() || undefined,
        url: (url || "").trim() || undefined,
        selector: (selector || "").trim() || undefined,
        code_snippet: codeSnippet || undefined,
        screenshots: combinedScreenshots.length
          ? combinedScreenshots
          : undefined,
        tag_ids: (tagIds || []).length ? tagIds : undefined,
        criteria: criteriaCodes.length
          ? criteriaCodes.map((key) => {
              const { version, code } = parseCriteriaKey(key);
              return { code, version };
            })
          : undefined,
      } as const;

      updateIssue.mutate(
        { id: issueId, payload: updatePayload },
        {
          onSuccess: (res) => {
            router.push(`/issues/${res.id}`);
          },
        },
      );
      return;
    }

    // Create mode requires an assessment
    if (!effectiveAssessmentId) {
      setLocalError(
        "Assessment is required. Please select an Assessment before creating an issue.",
      );
      return;
    } else {
      setLocalError(null);
    }

    const createPayload = {
      title: (title || "").trim(),
      description: (description || "").trim() || undefined,
      severity: severity,
      status: status,
      suggested_fix: (suggestedFix || "").trim() || undefined,
      impact: (impact || "").trim() || undefined,
      url: (url || "").trim() || undefined,
      selector: (selector || "").trim() || undefined,
      code_snippet: codeSnippet || undefined,
      screenshots: latestScreenshots.length ? latestScreenshots : undefined,
      tag_ids: (tagIds || []).length ? tagIds : undefined,
      assessment_id: effectiveAssessmentId,
      criteria:
        assessment?.wcag_version && criteriaCodes.length
          ? criteriaCodes.map((key) => {
              const { version, code } = parseCriteriaKey(key);
              return { code, version };
            })
          : [],
    } as unknown as CreateIssueRequest;

    createIssue.mutate(createPayload, {
      onSuccess: () => {
        reset();
        router.push("/issues");
      },
    });
  };

  return (
    <div>
      <form
        id={mode === "edit" ? "edit-issue-form" : "create-issue-form"}
        className={"flex flex-wrap"}
        onSubmit={rhfHandleSubmit(onSubmitRHF)}
      >
        <div className="p-6 w-full md:w-2/3">
          {/* Assessment selection */}
          <section className="bg-card rounded-lg p-4 border border-border mb-4">
            <label htmlFor="severity" className="block text-xl font-bold">
              Assessment <span className={"text-destructive"}>*</span>
            </label>
            {mode === "edit" ? (
              <div className="py-2">
                <p id="severity-help" className="text-sm text-gray-500 mb-1">
                  Assessment for this issue
                </p>
                <div
                  aria-describedby="severity-help"
                  className="w-full py-3 px-3 text-lg bg-muted rounded border border-border"
                >
                  {
                    // Prefer the server-provided assessment name; fallback to lookup
                    //TODO change this from Unknown assessment to something more descriptive
                    initialData?.assessment?.name ||
                      assessments.find((a) => a.id === effectiveAssessmentId)
                        ?.name ||
                      "(Unknown assessment)"
                  }
                </div>
              </div>
            ) : assessments.length === 0 ? (
              <div className="text-sm text-gray-700">
                <p className="mb-2">
                  You need to create an Assessment before creating issues.
                </p>
              </div>
            ) : (
              <>
                <p id="severity-help" className="text-sm text-gray-500 mb-1">
                  Choose an Assessment
                </p>
                <Select
                  value={effectiveAssessmentId || undefined}
                  onValueChange={(next) => {
                    if (next === effectiveAssessmentId) return;

                    const applyAssessment = (value: string) => {
                      setSelectedAssessmentId(value);
                      const params = new URLSearchParams(
                        Array.from(searchParams?.entries?.() || []),
                      );
                      if (value) {
                        params.set("assessment_id", value);
                      } else {
                        params.delete("assessment_id");
                      }
                      router.push(
                        `/issues/new${params.toString() ? `?${params.toString()}` : ""}`,
                      );
                    };

                    if (!effectiveAssessmentId) {
                      // First selection: no confirmation needed
                      applyAssessment(next);
                    } else {
                      // Changing selection: confirm and clear WCAG criteria if continuing
                      setPendingAssessmentId(next);
                      setShowAssessmentChangeConfirm(true);
                    }
                  }}
                >
                  <SelectTrigger
                    id="assessment-select"
                    className="w-full py-6 text-lg"
                    aria-required="true"
                  >
                    <SelectValue placeholder="Select an assessment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assessments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </section>

          {mode === "create" && (
            <AIAssistPanel
              aiPrompt={aiPrompt}
              onAiPromptChangeAction={setAiPrompt}
              aiBusy={aiBusy}
              onGenerateAction={handleAiAssist}
            />
          )}

          <CoreFields
            title={title}
            onTitleChangeAction={setTitle}
            description={description || ""}
            onDescriptionChangeAction={setDescription}
            url={url || ""}
            onUrlChangeAction={setUrl}
            severity={severity}
            onSeverityChangeAction={setSeverityFromString}
            impact={impact || ""}
            onImpactChangeAction={setImpact}
            suggestedFix={suggestedFix || ""}
            onSuggestedFixChangeAction={setSuggestedFix}
            selector={selector || ""}
            onSelectorChangeAction={setSelector}
            codeSnippet={codeSnippet || ""}
            onCodeSnippetChangeAction={setCodeSnippet}
            errors={errors}
          />


          {/* Status field */}
          <section className="bg-card rounded-lg p-4 border border-border mb-4">
            <label htmlFor="status" className="block text-xl font-bold">
              Status
            </label>
            <p id="status-help" className="text-sm text-gray-500 mb-1">
              Choose the current status of this issue.
            </p>
            <Select value={status || "open"} onValueChange={setStatusFromString}>
              <SelectTrigger
                id="status"
                className="w-full py-6 text-lg"
                aria-invalid={!!errors?.status}
                aria-describedby={`status-help${errors?.status ? " status-error" : ""}`}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors?.status && (
              <p id="status-error" className="text-sm text-red-600 mt-1" role="alert">
                {String(errors.status.message)}
              </p>
            )}
            <div className="mb-6" />
          </section>

          <WcagCriteriaSection
            isLoading={wcagLoading}
            error={wcagError as Error | undefined}
            options={wcagOptions}
            selected={criteriaCodes}
            onSelectedChangeAction={setCriteriaCodes}
            disabled={!effectiveWcagVersion}
            version={effectiveWcagVersion ?? null}
            errors={errors}
          />

          <TagsSection
            isLoading={tagsLoading}
            error={tagsError as Error | undefined}
            options={tagOptions}
            selected={tagIds}
            onSelectedChangeAction={(arr) => setTagIds(arr)}
          />
        </div>

        <div className="p-6 w-full md:w-1/3 dark:bg-border-border border-l border-border">
          <AttachmentsSection
            filesToUpload={filesToUpload}
            onFilesChangeAction={setFilesToUpload}
            uploading={uploading}
            uploadError={uploadError}
            // Show newly uploaded URLs in the "Uploaded" section
            screenshots={uploadedUrls}
            // Show existing images (edit mode) with ability to remove
            existingImages={existingImages.filter(
              (u) => !imagesToRemove.includes(u),
            )}
            onRemoveExistingImage={(url) =>
              setImagesToRemove((prev) => dedupeStrings([...(prev || []), url]))
            }
          />
        </div>
      </form>
      {mode === "create" && (
        <ConfirmationModal
          isOpen={showAssessmentChangeConfirm}
          onClose={() => {
            setShowAssessmentChangeConfirm(false);
            setPendingAssessmentId("");
          }}
          onConfirm={() => {
            // Clear any selected WCAG criteria and apply the pending assessment
            setCriteriaCodes([]);
            if (pendingAssessmentId) {
              setSelectedAssessmentId(pendingAssessmentId);
              const params = new URLSearchParams(
                Array.from(searchParams?.entries?.() || []),
              );
              params.set("assessment_id", pendingAssessmentId);
              router.push(
                `/issues/new${params.toString() ? `?${params.toString()}` : ""}`,
              );
            }
            setPendingAssessmentId("");
          }}
          title="Change Assessment?"
          message="Changing the Assessment will remove any selected WCAG criteria. Do you want to continue?"
          confirmButtonText="Continue"
          cancelButtonText="Cancel"
        />
      )}
      {/* Unsaved changes confirmation */}
      <ConfirmationModal
        isOpen={showUnsavedConfirm}
        onClose={() => {
          setShowUnsavedConfirm(false);
          setPendingHref(null);
        }}
        onConfirm={() => {
          const target = pendingHref ?? (mode === "edit" ? `/issues/${issueId}` : "/issues");
          try {
            const u = new URL(target, window.location.href);
            const path = `${u.pathname}${u.search}${u.hash}`;
            router.push(path);
          } catch {
            router.push(target);
          }
        }}
        title="Discard changes?"
        message="You will lose any information you have already entered. Continue?"
        confirmButtonText="Leave page"
        cancelButtonText="Continue editing"
      />
      <div className="mt-6 flex items-center gap-3">
        <FormActions
          formId={mode === "edit" ? "edit-issue-form" : "create-issue-form"}
          submitting={
            (mode === "edit" ? updateIssue.isPending : createIssue.isPending) ||
            uploading
          }
          error={
            (localError ??
              uploadError ??
              (mode === "edit"
                ? updateIssue.error?.message
                : createIssue.error?.message) ??
              null) as string | null
          }
        />
        <Button
          type="button"
          variant="outline"
          onClick={(e) => {
            e.preventDefault();
            const cancelTarget = mode === "edit" ? `/issues/${issueId}` : "/issues";
            if (isSubmitting) return;
            if (isDirty) {
              setPendingHref(cancelTarget);
              setShowUnsavedConfirm(true);
            } else {
              router.push(cancelTarget);
            }
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
