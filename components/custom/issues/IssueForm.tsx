"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { CreateIssueInput } from "@/lib/validation/issues";
import { useRouter, useSearchParams } from "next/navigation";
import type { CreateIssueRequest, WcagVersion } from "@/types/issue";
import type { IssueStatus, Severity } from "@/types/common";
import { useTagsQuery } from "@/lib/query/use-tags-query";
import { useCreateIssueMutation } from "@/lib/query/use-create-issue-mutation";
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

function IssueForm() {
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
        value: c.code,
        label: `${c.code} — ${c.name} (${c.level})`,
      }));
  }, [allCriteria, assessment?.wcag_version]);

  const createIssue = useCreateIssueMutation();

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
    if (!effectiveAssessmentId) {
      setLocalError(
        "Assessment is required. Please select an Assessment before creating an issue.",
      );
      return;
    } else {
      setLocalError(null);
    }

    const payload = {
      title: (title || "").trim(),
      description: (description || "").trim() || undefined,
      severity: severity,
      status: status,
      suggested_fix: (suggestedFix || "").trim() || undefined,
      impact: (impact || "").trim() || undefined,
      url: (url || "").trim() || undefined,
      selector: (selector || "").trim() || undefined,
      code_snippet: codeSnippet || undefined,
      screenshots: (screenshots || []).length ? screenshots : undefined,
      tag_ids: (tagIds || []).length ? tagIds : undefined,
      assessment_id: effectiveAssessmentId,
      criteria:
        assessment?.wcag_version && criteriaCodes.length
          ? criteriaCodes.map((code) => ({
              code,
              version: assessment.wcag_version as WcagVersion,
            }))
          : [],
    } as unknown as CreateIssueRequest;

    createIssue.mutate(payload, {
      onSuccess: () => {
        reset();
        router.push("/issues");
      },
    });
  };

  // Uploads via hook
  const { filesToUpload, setFilesToUpload, uploading, uploadError, upload } =
    useFileUploads({
      folder: "a11y-logger/issues",
      onUploaded: (urls) => setScreenshots(urls),
    });

  const handleUpload = async () => {
    await upload();
  };
  return (
    <div>
      <form id={"create-issue-form"} onSubmit={rhfHandleSubmit(onSubmitRHF)}>
        {/* Assessment selection */}
        <section className="bg-card rounded-lg p-4 border border-border mb-4">
          <h2 className="text-lg font-semibold mb-4">Assessment</h2>
          {assessments.length === 0 ? (
            <div className="text-sm text-gray-700">
              <p className="mb-2">
                You need to create an Assessment before creating issues.
              </p>
              <a href="/assessments" className="text-primary underline">
                Go to Assessments
              </a>
            </div>
          ) : assessmentIdFromUrl ? (
            <div className="text-sm">
              <p>
                <span className="font-medium">Selected:</span>{" "}
                {assessment?.name || assessmentIdFromUrl}{" "}
                <span className="ml-2 text-gray-500">(locked by context)</span>
              </p>
            </div>
          ) : (
            <div>
              <label
                htmlFor="assessment-select"
                className="block text-sm font-medium mb-1"
              >
                Choose an Assessment
              </label>
              <select
                id="assessment-select"
                className="w-full h-10 rounded-md border border-gray-300 px-3 a11y-focus"
                value={selectedAssessmentId}
                onChange={(e) => {
                  const next = e.target.value;
                  setSelectedAssessmentId(next);
                  // reflect in URL for consistency
                  const params = new URLSearchParams(
                    Array.from(searchParams?.entries?.() || []),
                  );
                  if (next) {
                    params.set("assessment_id", next);
                  } else {
                    params.delete("assessment_id");
                  }
                  router.push(
                    `/issues/new${params.toString() ? `?${params.toString()}` : ""}`,
                  );
                }}
                aria-required="true"
              >
                <option value="">Select an assessment...</option>
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        <AIAssistPanel
          aiPrompt={aiPrompt}
          onAiPromptChangeAction={setAiPrompt}
          aiBusy={aiBusy}
          onGenerateAction={handleAiAssist}
        />

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

        <AttachmentsSection
          filesToUpload={filesToUpload}
          onFilesChangeAction={setFilesToUpload}
          uploading={uploading}
          uploadError={uploadError}
          onUploadAction={handleUpload}
          screenshots={screenshots}
        />

        <FormActions
          formId="create-issue-form"
          submitting={createIssue.isPending}
          error={
            (localError ?? createIssue.error?.message ?? null) as string | null
          }
        />
      </form>
    </div>
  );
}

export default IssueForm;
