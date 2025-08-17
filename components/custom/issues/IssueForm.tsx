"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createIssueSchema,
  type CreateIssueInput,
} from "@/lib/validation/issues";
import { parseCriteriaKey } from "@/lib/issues/constants";
import { useRouter, useSearchParams } from "next/navigation";
import type { CreateIssueRequest, WcagVersion } from "@/types/issue";
import type { IssueStatus, Severity } from "@/types/common";
import { useTagsQuery } from "@/lib/query/use-tags-query";
import { useCreateIssueMutation } from "@/lib/query/use-create-issue-mutation";
import AIAssistPanel from "@/components/custom/issues/AIAssistPanel";
import CoreFields from "@/components/custom/issues/CoreFields";
import WcagCriteriaSection from "@/components/custom/issues/WcagCriteriaSection";
import TagsSection from "@/components/custom/issues/TagsSection";
import AttachmentsSection from "@/components/custom/issues/AttachmentsSection";
import FormActions from "@/components/custom/issues/FormActions";
import {
  useAiAssist,
  applyAiSuggestionsNonDestructive,
} from "@/lib/hooks/use-ai-assist";
import { useFileUploads } from "@/lib/hooks/use-file-uploads";
import { useWcagFilters } from "@/lib/hooks/use-wcag-filters";

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
    resolver: zodResolver(createIssueSchema),
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
  const assessmentId = (searchParams?.get("assessment_id") || "");
  const [localError, setLocalError] = useState<string | null>(null);

  // WCAG criteria selection
  const [criteriaSelected, setCriteriaSelected] = useState<string[]>([]);

  useEffect(() => {
    const crit: CreateIssueInput["criteria"] = (criteriaSelected || []).map(
      (key) => {
        const { version, code } = parseCriteriaKey(key);
        return { version: version as WcagVersion, code };
      },
    );
    setValue("criteria", crit, { shouldValidate: false });
  }, [criteriaSelected, setValue]);

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

  // WCAG criteria filters via hook
  const {
    versionFilter: wcagVersionFilter,
    setVersionFilter: setWcagVersionFilter,
    levelFilter: wcagLevelFilter,
    setLevelFilter: setWcagLevelFilter,
    options: filteredWcagOptions,
    isLoading: criteriaLoading,
    error: criteriaError,
  } = useWcagFilters();

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
      criteria_hints: criteriaSelected.map((key) => {
        const { version, code } = parseCriteriaKey(key);
        return { version: version as WcagVersion, code };
      }),
    }),
    applySuggestions: (json) =>
      applyAiSuggestionsNonDestructive(json, {
        current: {
          title,
          description,
          suggested_fix: suggestedFix,
          impact,
          severity: severity,
          criteriaKeys: criteriaSelected,
        },
        set: {
          setTitle,
          setDescription,
          setSuggestedFix,
          setImpact,
          setSeverity: setSeverityFromString,
          setCriteriaKeys: setCriteriaSelected,
        },
      }),
  });

  const handleAiAssist = (e: React.FormEvent) => {
    e.preventDefault();
    void generate();
  };

  const onSubmitRHF = async () => {
    clearErrors();
    if (!assessmentId) {
      setLocalError("Assessment is required. Open this form from an Assessment context or include ?assessment_id=<uuid> in the URL.");
      return;
    } else {
      setLocalError(null);
    }

    const criteria = criteriaSelected.map((key) => {
      const { version, code } = parseCriteriaKey(key);
      return { code, version: version as WcagVersion };
    });

    const payload: CreateIssueRequest = {
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
      criteria,
      assessment_id: assessmentId,
    };

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
          isLoading={criteriaLoading}
          error={criteriaError as Error | undefined}
          versionFilter={wcagVersionFilter}
          onVersionFilterChangeAction={setWcagVersionFilter}
          levelFilter={wcagLevelFilter}
          onLevelFilterChangeAction={setWcagLevelFilter}
          options={filteredWcagOptions}
          selected={criteriaSelected}
          onSelectedChangeAction={(arr) => setCriteriaSelected(arr)}
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
          error={(localError ?? createIssue.error?.message ?? null) as string | null}
        />
      </form>
    </div>
  );
}

export default IssueForm;
