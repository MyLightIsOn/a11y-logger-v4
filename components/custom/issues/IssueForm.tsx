"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createIssueSchema,
  type CreateIssueInput,
} from "@/lib/validation/issues";
import { parseCriteriaKey } from "@/lib/issues/constants";
import { useRouter } from "next/navigation";
import type { CreateIssueRequest, WcagVersion } from "@/types/issue";
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
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string[],
    string[],
  ];

  const router = useRouter();

  // WCAG criteria selection
  const [criteriaSelected, setCriteriaSelected] = useState<string[]>([]);

  useEffect(() => {
    const crit = (criteriaSelected || []).map((key) => {
      const { version, code } = parseCriteriaKey(key);
      return { version: version as WcagVersion, code };
    });
    setValue("criteria", crit as any, { shouldValidate: false });
  }, [criteriaSelected, setValue]);

  // Create Issue mutation (Step 9)
  const createIssue = useCreateIssueMutation();

  // Setters mapping to RHF (Step 10 - remove local state)
  const setTitle = (v: string) =>
    setValue("title", v, { shouldValidate: false });
  const setDescription = (v: string) =>
    setValue("description", v, { shouldValidate: false });
  const setSeverity = (v: string) =>
    setValue("severity", v as any, { shouldValidate: false });
  const setStatus = (v: string) =>
    setValue("status", v as any, { shouldValidate: false });
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
      severity_hint: severity as any,
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
          severity: severity as any,
          criteriaKeys: criteriaSelected,
        },
        set: {
          setTitle,
          setDescription,
          setSuggestedFix,
          setImpact,
          setSeverity,
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

    const criteria = criteriaSelected.map((key) => {
      const { version, code } = parseCriteriaKey(key);
      return { code, version: version as WcagVersion };
    });

    const payload: CreateIssueRequest = {
      title: (title || "").trim(),
      description: (description || "").trim() || undefined,
      severity: severity as any,
      status: status as any,
      suggested_fix: (suggestedFix || "").trim() || undefined,
      impact: (impact || "").trim() || undefined,
      url: (url || "").trim() || undefined,
      selector: (selector || "").trim() || undefined,
      code_snippet: codeSnippet || undefined,
      screenshots: (screenshots || []).length ? screenshots : undefined,
      tag_ids: (tagIds || []).length ? tagIds : undefined,
      criteria,
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
          onAiPromptChange={setAiPrompt}
          aiBusy={aiBusy}
          onGenerate={handleAiAssist}
        />

        <CoreFields
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          url={url}
          onUrlChange={setUrl}
          severity={severity}
          onSeverityChange={setSeverity}
          impact={impact}
          onImpactChange={setImpact}
          suggestedFix={suggestedFix}
          onSuggestedFixChange={setSuggestedFix}
          errors={errors}
        />

        <WcagCriteriaSection
          isLoading={criteriaLoading}
          error={criteriaError as Error | undefined}
          versionFilter={wcagVersionFilter}
          onVersionFilterChange={setWcagVersionFilter}
          levelFilter={wcagLevelFilter}
          onLevelFilterChange={setWcagLevelFilter}
          options={filteredWcagOptions}
          selected={criteriaSelected}
          onSelectedChange={(arr) => setCriteriaSelected(arr)}
          errors={errors}
        />

        <TagsSection
          isLoading={tagsLoading}
          error={tagsError as Error | undefined}
          options={tagOptions}
          selected={tagIds}
          onSelectedChange={(arr) => setTagIds(arr)}
        />

        <AttachmentsSection
          filesToUpload={filesToUpload}
          onFilesChange={setFilesToUpload}
          uploading={uploading}
          uploadError={uploadError}
          onUpload={handleUpload}
          screenshots={screenshots}
        />

        <FormActions
          formId="create-issue-form"
          submitting={createIssue.isPending}
          error={(createIssue.error?.message ?? null) as string | null}
        />
      </form>
    </div>
  );
}

export default IssueForm;
