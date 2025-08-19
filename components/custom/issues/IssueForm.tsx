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
import { parseCriteriaKey } from "@/lib/issues/constants";
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

function IssueForm({ mode = "create", issueId, initialData }: IssueFormProps) {
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
  // Assessment change confirmation modal state
  const [showAssessmentChangeConfirm, setShowAssessmentChangeConfirm] =
    useState<boolean>(false);
  const [pendingAssessmentId, setPendingAssessmentId] = useState<string>("");

  // Load assessments to resolve the selected assessment's WCAG version for AI context
  const { data: assessments = [] } = useAssessmentsQuery();

  // Current effective assessment context: URL param wins (locked), otherwise local selection
  const effectiveAssessmentId =
    assessmentIdFromUrl || selectedAssessmentId || "";
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

  const wcagOptions = useMemo(() => {
    if (!assessment?.wcag_version) return [];
    const v = assessment.wcag_version as WcagVersion;
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
  }, [allCriteria, assessment?.wcag_version]);

  const createIssue = useCreateIssueMutation();
  const updateIssue = useUpdateIssueMutation();

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
    setValue(
      "screenshots",
      Array.isArray(initialData.screenshots) ? initialData.screenshots : [],
      { shouldValidate: false },
    );
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
  }, [initialData, setValue]);

  const setTitle = (v: string) =>
    setValue("title", v, { shouldValidate: false });
  const setDescription = (v: string) =>
    setValue("description", v, { shouldValidate: false });
  const setSeverity = (v: Severity) =>
    setValue("severity", v, { shouldValidate: false });
  const setSeverityFromString = (v: string) => setSeverity(v as Severity);
  // Note: status is not currently user-editable in this form; no setter needed
  const setSuggestedFix = (v: string) =>
    setValue("suggested_fix", v, { shouldValidate: false });
  const setImpact = (v: string) =>
    setValue("impact", v, { shouldValidate: false });
  const setUrl = (v: string) => setValue("url", v, { shouldValidate: false });
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
        screenshots: latestScreenshots.length ? latestScreenshots : undefined,
        tag_ids: (tagIds || []).length ? tagIds : undefined,
        criteria:
          assessment?.wcag_version && criteriaCodes.length
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

  // Uploads via hook
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
  console.log(title);
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
            {assessments.length === 0 ? (
              <div className="text-sm text-gray-700">
                <p className="mb-2">
                  You need to create an Assessment before creating issues.
                </p>
              </div>
            ) : (
              <div>
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
              </div>
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
            errors={errors}
          />

          <WcagCriteriaSection
            isLoading={wcagLoading}
            error={wcagError as Error | undefined}
            options={wcagOptions}
            selected={criteriaCodes}
            onSelectedChangeAction={setCriteriaCodes}
            disabled={!assessment?.wcag_version}
            version={assessment?.wcag_version ?? null}
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
            screenshots={screenshots}
          />
        </div>
      </form>
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
    </div>
  );
}

export default IssueForm;
