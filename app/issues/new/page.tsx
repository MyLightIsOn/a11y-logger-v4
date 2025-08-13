"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { issuesApi, tagsApi } from "@/lib/api";
import type { CreateIssueRequest, WcagVersion } from "@/types/issue";
import { criteriaApi } from "@/lib/api/criteria";

const severityOptions = [
  { value: "1", label: "Critical" },
  { value: "2", label: "High" },
  { value: "3", label: "Medium" },
  { value: "4", label: "Low" },
];

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "archive", label: "Archived" },
];

export default function NewIssuePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // WCAG criteria selection
  const [wcagVersionFilter, setWcagVersionFilter] = useState<WcagVersion | "all">("all");
  const [wcagLevelFilter, setWcagLevelFilter] = useState<"all" | "A" | "AA" | "AAA">("all");
  const [criteriaSelected, setCriteriaSelected] = useState<string[]>([]); // store as `${version}|${code}`

  const firstInvalidRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Load WCAG criteria from API and build options
  const [wcagOptions, setWcagOptions] = useState<{
    value: string;
    label: string;
    level: "A" | "AA" | "AAA";
    version: WcagVersion;
  }[]>([]);
  const [wcagLoadError, setWcagLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await criteriaApi.getCriteria();
        if (mounted && res.success && Array.isArray(res.data?.data)) {
          const arr = res.data!.data.map((item) => ({
            value: `${item.version}|${item.code}`,
            label: `${item.code} ${item.name} (${item.version}, ${item.level})`,
            level: item.level,
            version: item.version,
          }));
          setWcagOptions(arr);
        } else if (mounted && !res.success) {
          setWcagLoadError(res.error || "Failed to load WCAG criteria");
        }
      } catch (e: any) {
        if (mounted) setWcagLoadError(e?.message || "Failed to load WCAG criteria");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredWcagOptions = useMemo(() => {
    return wcagOptions
      .filter((opt: any) => (wcagVersionFilter === "all" ? true : opt.version === wcagVersionFilter))
      .filter((opt: any) => (wcagLevelFilter === "all" ? true : opt.level === wcagLevelFilter))
      .map((opt) => ({ value: opt.value, label: opt.label }));
  }, [wcagOptions, wcagVersionFilter, wcagLevelFilter]);

  // Tags options loaded from API
  const [tagOptions, setTagOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await tagsApi.getTags();
        if (mounted && res.success && Array.isArray(res.data?.data)) {
          const options = res.data!.data.map((t) => ({ value: t.id, label: t.label }));
          setTagOptions(options);
        }
      } catch (e) {
        // silently ignore; tags are optional
        console.warn("Failed to load tags");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Uploader state
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
      const res = await fetch("/api/uploads/images", { method: "POST", body: form });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Upload failed (${res.status})`);
      }
      const json = await res.json();
      const urls = (json?.data || []).map((it: any) => it.url).filter(Boolean);
      setScreenshots((prev) => Array.from(new Set([...prev, ...urls])));
      setFilesToUpload(null);
    } catch (e: any) {
      console.error("Upload error", e);
      setUploadError(e?.message || "Failed to upload images");
    } finally {
      setUploading(false);
    }
  };

  // Basic client validation to focus first invalid field
  const validateClient = (): boolean => {
    if (!title.trim()) {
      setError("Title is required");
      firstInvalidRef.current?.focus();
      return false;
    }
    if (criteriaSelected.length === 0) {
      setError("Select at least one WCAG criterion");
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateClient()) return;
    setSubmitting(true);
    setError(null);

    const criteria = criteriaSelected.map((key) => {
      const [version, code] = key.split("|");
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

  // AI assistant stub
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string>("Use AI to suggest fields based on current context.");
  const handleAiAssist = async () => {
    setAiBusy(true);
    setAiError(null);
    setAiMessage("Generating suggestions...");
    try {
      // Attempt to call a future AI assist route; gracefully handle 404
      const res = await fetch("/api/ai/issue-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          screenshots,
          code_snippet: codeSnippet,
          url,
          selector,
          tags: tagIds,
          severity_hint: severity,
          criteria_hints: criteriaSelected.map((k) => {
            const [version, code] = k.split("|");
            return { code, version };
          }),
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
      // Apply conservative merges: fill empty title/description; merge criteria suggestions
      if (json?.title && !title) setTitle(json.title);
      if (json?.description && !description) setDescription(json.description);
      if (json?.suggested_fix && !suggestedFix) setSuggestedFix(json.suggested_fix);
      if (json?.impact && !impact) setImpact(json.impact);
      if (json?.severity_suggestion) setSeverity(String(json.severity_suggestion));
      if (Array.isArray(json?.criteria)) {
        const newKeys = json.criteria
          .map((c: any) => `${c.version}|${c.code}`)
          .filter((k: string) => typeof k === "string");
        setCriteriaSelected((prev) => Array.from(new Set([...(prev || []), ...newKeys])));
      }
      setAiMessage("Suggestions applied. Review and adjust as needed.");
    } catch (e: any) {
      setAiError(e?.message || "AI assist failed");
      setAiMessage("AI assist unavailable. You can continue filling the form manually.");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create Issue</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/issues")}>Cancel</Button>
          <Button form="create-issue-form" type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Issue"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <form id="create-issue-form" onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          {/* Context */}
          <section aria-labelledby="context-heading" className="bg-card rounded-lg p-4 border border-border">
            <h2 id="context-heading" className="text-lg font-semibold mb-4">Context</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="url">URL</Label>
                <Input id="url" name="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/page" />
              </div>
              <div>
                <Label htmlFor="selector">Selector</Label>
                <Input id="selector" name="selector" value={selector} onChange={(e) => setSelector(e.target.value)} placeholder="#main .button" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="code_snippet">Code Snippet</Label>
                <textarea
                  id="code_snippet"
                  name="code_snippet"
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  className="w-full min-h-28 font-mono rounded-md border border-gray-300 p-2 a11y-focus"
                  placeholder="Paste relevant HTML/JSX/CSS..."
                />
              </div>
            </div>
          </section>

          {/* Details */}
          <section aria-labelledby="details-heading" className="bg-card rounded-lg p-4 border border-border">
            <h2 id="details-heading" className="text-lg font-semibold mb-4">Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="title">Title<span className="sr-only"> (required)</span></Label>
                <Input
                  id="title"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-required="true"
                  aria-invalid={!title.trim()}
                  ref={firstInvalidRef as any}
                  placeholder="Short, descriptive title"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-28 rounded-md border border-gray-300 p-2 a11y-focus"
                  placeholder="Describe the issue, reproduction, expected/actual behavior, etc."
                />
              </div>
              <div>
                <Label htmlFor="severity">Severity</Label>
                <select
                  id="severity"
                  name="severity"
                  className="w-full h-10 rounded-md border border-gray-300 px-3 a11y-focus"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  {severityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  className="w-full h-10 rounded-md border border-gray-300 px-3 a11y-focus"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* WCAG */}
          <section aria-labelledby="wcag-heading" className="bg-card rounded-lg p-4 border border-border">
            <h2 id="wcag-heading" className="text-lg font-semibold mb-4">WCAG Criteria</h2>
                        {wcagLoadError && (
                          <p role="status" className="text-sm text-red-700 mb-2">{wcagLoadError}</p>
                        )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              <div>
                <Label htmlFor="wcag-version">Version</Label>
                <select
                  id="wcag-version"
                  className="w-full h-10 rounded-md border border-gray-300 px-3 a11y-focus"
                  value={wcagVersionFilter}
                  onChange={(e) => setWcagVersionFilter((e.target.value as any) || "all")}
                >
                  <option value="all">All</option>
                  <option value="2.1">2.1</option>
                  <option value="2.2">2.2</option>
                </select>
              </div>
              <div>
                <Label htmlFor="wcag-level">Level</Label>
                <select
                  id="wcag-level"
                  className="w-full h-10 rounded-md border border-gray-300 px-3 a11y-focus"
                  value={wcagLevelFilter}
                  onChange={(e) => setWcagLevelFilter((e.target.value as any) || "all")}
                >
                  <option value="all">All</option>
                  <option value="A">A</option>
                  <option value="AA">AA</option>
                  <option value="AAA">AAA</option>
                </select>
              </div>
            </div>
            <Label htmlFor="criteria">Criteria</Label>
            <MultiSelect
              id="criteria"
              options={filteredWcagOptions}
              selected={criteriaSelected}
              onChangeAction={(arr) => setCriteriaSelected(arr as string[])}
              placeholder="Search and select WCAG criteria..."
              className="w-full"
            />
            <p className="text-sm text-gray-500 mt-2">Select at least one criterion.</p>
          </section>

          {/* Attachments */}
          <section aria-labelledby="attachments-heading" className="bg-card rounded-lg p-4 border border-border">
            <h2 id="attachments-heading" className="text-lg font-semibold mb-4">Attachments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <Label htmlFor="screenshots">Screenshots</Label>
                <input
                  id="screenshots"
                  type="file"
                  multiple
                  accept="image/*"
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer focus:outline-dashed focus:outline-4 focus:outline-offset-4 focus:outline-primary"
                  onChange={(e) => setFilesToUpload(e.target.files)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={handleUpload} disabled={uploading || !filesToUpload}>
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
                {uploadError && <span className="text-sm text-red-600" role="status">{uploadError}</span>}
              </div>
            </div>
            {screenshots.length > 0 && (
              <div className="mt-3">
                <p className="text-sm mb-2">Uploaded:</p>
                <ul className="list-disc pl-5 text-sm">
                  {screenshots.map((u) => (
                    <li key={u} className="break-all">
                      <a href={u} target="_blank" rel="noreferrer" className="text-blue-600 underline">{u}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Tags */}
          <section aria-labelledby="tags-heading" className="bg-card rounded-lg p-4 border border-border">
            <h2 id="tags-heading" className="text-lg font-semibold mb-4">Tags</h2>
            <MultiSelect
              id="tags"
              options={tagOptions}
              selected={tagIds}
              onChangeAction={(arr) => setTagIds(arr as string[])}
              placeholder="Select tags..."
              className="w-full"
            />
            <p className="text-sm text-gray-500 mt-2">Tags are optional. This environment may not have predefined tags yet.</p>
          </section>

          {/* Remediation */}
          <section aria-labelledby="remediation-heading" className="bg-card rounded-lg p-4 border border-border">
            <h2 id="remediation-heading" className="text-lg font-semibold mb-4">Remediation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="suggested_fix">Suggested Fix</Label>
                <textarea
                  id="suggested_fix"
                  name="suggested_fix"
                  value={suggestedFix}
                  onChange={(e) => setSuggestedFix(e.target.value)}
                  className="w-full min-h-24 rounded-md border border-gray-300 p-2 a11y-focus"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="impact">Impact</Label>
                <textarea
                  id="impact"
                  name="impact"
                  value={impact}
                  onChange={(e) => setImpact(e.target.value)}
                  className="w-full min-h-24 rounded-md border border-gray-300 p-2 a11y-focus"
                />
              </div>
            </div>
          </section>
        </form>

        {/* AI assistant aside */}
        <aside className="lg:col-span-1 space-y-4" aria-labelledby="ai-assistant-heading">
          <section className="bg-card rounded-lg p-4 border border-border">
            <h2 id="ai-assistant-heading" className="text-lg font-semibold mb-4">AI Assistant</h2>
            <p className="text-sm text-gray-700 mb-3">{aiMessage}</p>
            {aiError && <p className="text-sm text-red-700 mb-2">{aiError}</p>}
            <Button type="button" onClick={handleAiAssist} disabled={aiBusy}>
              {aiBusy ? "Working..." : "Generate/Refine with AI"}
            </Button>
            <p className="text-xs text-gray-500 mt-3">If AI is unavailable, continue filling the form manually.</p>
          </section>
          <section className="bg-card rounded-lg p-4 border border-border">
            <h3 className="font-semibold mb-2">Tips</h3>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
              <li>Upload screenshots before using AI so it can reference them.</li>
              <li>Provide a clear description for better title and criteria suggestions.</li>
              <li>You can adjust or override any AI suggestions.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
