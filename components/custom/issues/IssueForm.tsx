"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createIssueSchema,
  type CreateIssueInput,
} from "@/lib/validation/issues";
import { parseCriteriaKey } from "@/lib/issues/constants";
import { useRouter } from "next/navigation";
import { issuesApi } from "@/lib/api";
import type { CreateIssueRequest, WcagVersion } from "@/types/issue";
import { useTagsQuery } from "@/lib/query/use-tags-query";
import AIAssistPanel from "@/components/custom/issues/AIAssistPanel";
import CoreFields from "@/components/custom/issues/CoreFields";
import WcagCriteriaSection from "@/components/custom/issues/WcagCriteriaSection";
import TagsSection from "@/components/custom/issues/TagsSection";
import AttachmentsSection from "@/components/custom/issues/AttachmentsSection";
import FormActions from "@/components/custom/issues/FormActions";
import { useAiAssist, applyAiSuggestionsNonDestructive } from "@/lib/hooks/use-ai-assist";
import { useFileUploads } from "@/lib/hooks/use-file-uploads";
import { useWcagFilters } from "@/lib/hooks/use-wcag-filters";


function IssueForm() {
  const {
    handleSubmit: rhfHandleSubmit,
    formState: { errors },
    setValue,
    clearErrors,
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
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("3");
  const [status, setStatus] = useState("open");
  const [suggestedFix, setSuggestedFix] = useState("");
  const [impact, setImpact] = useState("");
  const [url, setUrl] = useState("");
  const [selector, setSelector] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();

  // WCAG criteria selection
  const [criteriaSelected, setCriteriaSelected] = useState<string[]>([]);

  const firstInvalidRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null,
  );

  // Sync local state into RHF so the resolver can validate and provide inline errors
  useEffect(() => {
    setValue("title", title, { shouldValidate: false });
  }, [title, setValue]);
  useEffect(() => {
    setValue("description", description || "", { shouldValidate: false });
  }, [description, setValue]);
  useEffect(() => {
    setValue("severity", severity as any, { shouldValidate: false });
  }, [severity, setValue]);
  useEffect(() => {
    setValue("status", status as any, { shouldValidate: false });
  }, [status, setValue]);
  useEffect(() => {
    setValue("impact", impact || "", { shouldValidate: false });
  }, [impact, setValue]);
  useEffect(() => {
    setValue("suggested_fix", suggestedFix || "", { shouldValidate: false });
  }, [suggestedFix, setValue]);
  useEffect(() => {
    setValue("url", url || "", { shouldValidate: false });
  }, [url, setValue]);
  useEffect(() => {
    setValue("selector", selector || "", { shouldValidate: false });
  }, [selector, setValue]);
  useEffect(() => {
    setValue("code_snippet", codeSnippet || "", { shouldValidate: false });
  }, [codeSnippet, setValue]);
  useEffect(() => {
    setValue("screenshots", screenshots || [], { shouldValidate: false });
  }, [screenshots, setValue]);
  useEffect(() => {
    setValue("tag_ids", tagIds || [], { shouldValidate: false });
  }, [tagIds, setValue]);
  useEffect(() => {
    const crit = (criteriaSelected || []).map((key) => {
      const { version, code } = parseCriteriaKey(key);
      return { version: version as WcagVersion, code };
    });
    setValue("criteria", crit as any, { shouldValidate: false });
  }, [criteriaSelected, setValue]);

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
    setSubmitting(true);
    setError(null);

    const criteria = criteriaSelected.map((key) => {
      const { version, code } = parseCriteriaKey(key);
      return { code, version: version as WcagVersion };
    });

    const payload: CreateIssueRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      severity: severity as any,
      status: status as any,
      suggested_fix: suggestedFix.trim() || undefined,
      impact: impact.trim() || undefined,
      url: url.trim() || undefined,
      selector: selector.trim() || undefined,
      code_snippet: codeSnippet || undefined,
      screenshots: screenshots.length ? screenshots : undefined,
      tag_ids: tagIds.length ? tagIds : undefined,
      criteria,
    };

    try {
      const res = await issuesApi.createIssue(payload);
      if (!res.success) throw new Error(res.error || "Failed to create issue");
      // Navigate to issues list
      router.push("/issues");
    } catch (e: any) {
      console.error("Create issue error", e);
      setError(e?.message || "Failed to create issue");
    } finally {
      setSubmitting(false);
    }
  };

  // Uploads via hook
  const {
    filesToUpload,
    setFilesToUpload,
    uploading,
    uploadError,
    upload,
  } = useFileUploads({
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

        <FormActions formId="create-issue-form" submitting={submitting} error={error} />
      </form>
    </div>
  );
}

export default IssueForm;
