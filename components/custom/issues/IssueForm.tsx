"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createIssueSchema,
  type CreateIssueInput,
} from "@/lib/validation/issues";
import { makeCriteriaKey, parseCriteriaKey, dedupeStrings } from "@/lib/issues/constants";
import { useRouter } from "next/navigation";
import { issuesApi } from "@/lib/api";
import type { CreateIssueRequest, WcagVersion } from "@/types/issue";
import { useTagsQuery } from "@/lib/query/use-tags-query";
import { useWcagCriteriaQuery } from "@/lib/query/use-wcag-criteria-query";
import AIAssistPanel from "@/components/custom/issues/AIAssistPanel";
import CoreFields from "@/components/custom/issues/CoreFields";
import WcagCriteriaSection from "@/components/custom/issues/WcagCriteriaSection";
import TagsSection from "@/components/custom/issues/TagsSection";
import AttachmentsSection from "@/components/custom/issues/AttachmentsSection";
import FormActions from "@/components/custom/issues/FormActions";


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
  const [aiPrompt, setAiPrompt] = useState("");
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
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string>(
    "Use AI to suggest fields based on current context.",
  );
  const [aiBusy, setAiBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();

  // WCAG criteria selection
  const [wcagVersionFilter, setWcagVersionFilter] = useState<
    WcagVersion | "all"
  >("all");
  const [wcagLevelFilter, setWcagLevelFilter] = useState<
    "all" | "A" | "AA" | "AAA"
  >("all");
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

  // Data fetching via TanStack Query
  const {
    data: criteriaData = [],
    isLoading: criteriaLoading,
    error: criteriaError,
  } = useWcagCriteriaQuery();

  const wcagOptions = useMemo(
    () =>
      (criteriaData || []).map((item) => ({
        value: `${item.version}|${item.code}`,
        label: `${item.code} ${item.name} (${item.version}, ${item.level})`,
        level: item.level,
        version: item.version,
      })),
    [criteriaData],
  );

  const {
    data: tagsData = [],
    isLoading: tagsLoading,
    error: tagsError,
  } = useTagsQuery();

  const tagOptions = useMemo(
    () => (tagsData || []).map((t) => ({ value: t.id, label: t.label })),
    [tagsData],
  );

  const handleAiAssist = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiBusy(true);
    setAiError(null);
    setAiMessage("Generating suggestions...");
    try {
      const res = await fetch("/api/ai/issue-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: aiPrompt,
        }),
      });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("AI assist is not configured on this environment.");
        }
        const text = await res.text();
        throw new Error(text || `AI request failed (${res.status})`);
      }
      const json = await res.json();
      // Non-destructive application: fill only empty fields
      if (json?.title && !title) setTitle(json.title);
      if (json?.description && !description) setDescription(json.description);
      if (json?.suggested_fix && !suggestedFix)
        setSuggestedFix(json.suggested_fix);
      if (json?.impact && !impact) setImpact(json.impact);
      if (json?.severity_suggestion && severity === "3")
        setSeverity(String(json.severity_suggestion));
      if (Array.isArray(json?.criteria)) {
        const newKeys = json.criteria
          .map((c: any) => makeCriteriaKey(c.version as WcagVersion, c.code))
          .filter((k: string) => typeof k === "string");
        setCriteriaSelected((prev) =>
          dedupeStrings([...(prev || []), ...newKeys]),
        );
      }
      setAiMessage(
        "Suggestions applied. Empty fields were filled; existing values were left unchanged.",
      );
    } catch (e: any) {
      setAiError(e?.message || "AI assist failed");
      setAiMessage(
        "AI assist unavailable. You can continue filling the form manually.",
      );
    } finally {
      setAiBusy(false);
    }
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

  const filteredWcagOptions = useMemo(() => {
    return wcagOptions
      .filter((opt: any) =>
        wcagVersionFilter === "all" ? true : opt.version === wcagVersionFilter,
      )
      .filter((opt: any) =>
        wcagLevelFilter === "all" ? true : opt.level === wcagLevelFilter,
      )
      .map((opt) => ({ value: opt.value, label: opt.label }));
  }, [wcagOptions, wcagVersionFilter, wcagLevelFilter]);


  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [filesToUpload, setFilesToUpload] = useState<FileList | null>(null);

  const handleUpload = async () => {
    if (!filesToUpload || filesToUpload.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      Array.from(filesToUpload).forEach((f) => form.append("files", f));
      // optional folder to help organization
      form.append("folder", "a11y-logger/issues");
      const res = await fetch("/api/uploads/images", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Upload failed (${res.status})`);
      }
      const json = await res.json();
      const urls = (json?.data || []).map((it: any) => it.url).filter(Boolean);
      setScreenshots((prev) => dedupeStrings([...(prev || []), ...urls]));
      setFilesToUpload(null);
    } catch (e: any) {
      console.error("Upload error", e);
      setUploadError(e?.message || "Failed to upload images");
    } finally {
      setUploading(false);
    }
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
