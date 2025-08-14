"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select";
import { issuesApi, tagsApi } from "@/lib/api";
import type { CreateIssueRequest, WcagVersion } from "@/types/issue";
import { criteriaApi } from "@/lib/api/criteria";
import { AlertTriangle } from "lucide-react";
import AiIcon from "@/components/AiIcon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

function IssueForm() {
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

  useEffect(() => {
    /*TEST DATA*/
    const testIssues = {
      title: "Insufficient color contrast for login button",
      description:
        "The color contrast ratio of the login button does not meet the minimum requirements set by WCAG, making it difficult for users with visual impairments to perceive and interact with the button.",
      severity_suggestion: "2",
      criteria: [
        {
          code: "1.4.3",
          version: "2.1",
        },
      ],
      suggested_fix:
        "Ensure that the color contrast ratio between the login button text and its background is at least 4.5:1. You can adjust the colors in your CSS, for example: `background-color: #005a9c; color: #ffffff;`.",
      impact:
        "Insufficient color contrast can hinder users with low vision or color blindness from effectively using the login button, potentially preventing them from accessing the website.",
      tag_suggestions: ["color contrast", "accessibility", "WCAG"],
      url: "https://example.com/login",
      selector: "#login-button",
      code_snippet:
        '<button id="login-button" class="login-button">Login</button>',
      screenshots: [
        "https://example.com/login-screenshot-1.png",
        "https://example.com/login-screenshot-2.png",
      ],
    };

    setTitle(testIssues.title);
    setDescription(testIssues.description);
    setSeverity(testIssues.severity_suggestion);
    setImpact(testIssues.impact);
    setUrl(testIssues.url);
    setSelector(testIssues.selector);
    setCodeSnippet(testIssues.code_snippet);
    setScreenshots(testIssues.screenshots);
    setTagIds(testIssues.tag_suggestions);
    setSuggestedFix(testIssues.suggested_fix);

    console.log(severity);
  }, []);

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
        if (mounted)
          setWcagLoadError(e?.message || "Failed to load WCAG criteria");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await tagsApi.getTags();
        if (mounted && res.success && Array.isArray(res.data?.data)) {
          const options = res.data!.data.map((t) => ({
            value: t.id,
            label: t.label,
          }));
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

  // Load WCAG criteria from API and build options
  const [wcagOptions, setWcagOptions] = useState<
    {
      value: string;
      label: string;
      level: "A" | "AA" | "AAA";
      version: WcagVersion;
    }[]
  >([]);
  const [wcagLoadError, setWcagLoadError] = useState<string | null>(null);

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
          description: description,
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

      if (json?.title && !title) setTitle(json.title);
      if (json?.description && !description) setDescription(json.description);
      if (json?.suggested_fix && !suggestedFix)
        setSuggestedFix(json.suggested_fix);
      if (json?.impact && !impact) setImpact(json.impact);
      if (json?.severity_suggestion)
        setSeverity(String(json.severity_suggestion));
      if (Array.isArray(json?.criteria)) {
        const newKeys = json.criteria
          .map((c: any) => `${c.version}|${c.code}`)
          .filter((k: string) => typeof k === "string");
        setCriteriaSelected((prev) =>
          Array.from(new Set([...(prev || []), ...newKeys])),
        );
      }
      setAiMessage("Suggestions applied. Review and adjust as needed.");
    } catch (e: any) {
      setAiError(e?.message || "AI assist failed");
      setAiMessage(
        "AI assist unavailable. You can continue filling the form manually.",
      );
    } finally {
      setAiBusy(false);
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
    console.log("saving");
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
    console.log("test");
    try {
      console.log("hello?");
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

  const [tagOptions, setTagOptions] = useState<
    { value: string; label: string }[]
  >([]);

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
      setScreenshots((prev) => Array.from(new Set([...prev, ...urls])));
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
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <form id={"create-issue-form"} onSubmit={handleSubmit}>
        <div className="mb-4 bg-tags/80 dark:bg-tags/10 p-6 rounded-md border-button-background border">
          <div
            className={"text-md font-medium text-gray-700 dark:text-white mb-4"}
          >
            <p className={"mb-4"}>
              You can enter a description here and press the Generate Issue
              Button to have the rest of the issue filled out by the AI. For the
              best results, please include the following information:
            </p>

            <ol className={"mb-5 pl-10 list-decimal"}>
              <li>
                <span className={"font-bold pl-1"}>Component</span>: What
                element is affected? (e.g., &#34;Search button&#34;)
              </li>
              <li>
                <span className={"font-bold pl-1"}>Location</span>: Where does
                the issue occur? (e.g., &#34;Homepage&#34;)
              </li>
              <li>
                <span className={"font-bold pl-1"}>What&apos;s Happening?</span>
                : What is wrong? (e.g., &#34;Not focusable via keyboard&#34;)
              </li>
              <li>
                <span className={"font-bold pl-1"}>
                  Expected Behavoir (Optional)
                </span>
                : What is the expected behavoir?
              </li>
            </ol>
            <p className={"flex items-center mb-4 text-sm"}>
              <AlertTriangle className="h-10 w-10 fill-amber-200 mr-2 dark:stroke-black" />
              Important: If you plan to use AI assistance, please do so before
              filling out any issue fields. The AI will overwrite any existing
              field data when generating the issue details.
            </p>
          </div>

          <label
            htmlFor="aiAssistanceDescription"
            className="block text-xl font-bold"
          >
            AI Assistance Description
          </label>
          <Textarea
            id="aiAssistanceDescription"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setDescription(e.target.value)
            }
            rows={4}
            placeholder="Example: The search button on the homepage is not operable via keyboard. It should be focusable and activated using the Enter key."
            className="mt-1 block w-full mb-4"
          />
          <Button
            className={"bg-button-background text-md gap-4"}
            type="button"
            onClick={handleAiAssist}
            disabled={aiBusy}
          >
            {aiBusy ? "Working..." : "Generate/Refine with AI"} <AiIcon />
          </Button>
        </div>

        <div className="mb-4">
          <label htmlFor="title" className="block text-xl font-bold">
            Title <span className={"text-destructive"}>*</span>
          </label>
          <p className="text-sm text-gray-500 mb-1">
            Provide a short title of the issue.
          </p>
          <Input
            type="text"
            id="title"
            value={title}
            placeholder={"Example: Search button not focusable..."}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTitle(e.target.value)
            }
            className="mt-1 block w-full mb-8"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="description" className="block text-xl font-bold">
            Description <span className={"text-destructive"}>*</span>
          </label>
          <p className="text-sm text-gray-500 mb-1">
            Provide a detailed description of the issue.
          </p>
          <Textarea
            id="description"
            value={description || ""}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setDescription(e.target.value)
            }
            rows={4}
            className="mt-1 block w-full mb-8"
            placeholder="Example: The search button on the homepage is not focusable via keyboard."
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="url" className="block text-xl font-bold">
            URL
          </label>
          <p className="text-sm text-gray-500 mb-1">
            Enter the URL of the page where the issue was found.
          </p>
          <Input
            type="url"
            id="url"
            value={url}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setUrl(e.target.value)
            }
            className="mt-1 block w-full mb-8 placeholder:text-gray-400"
            placeholder={"Example: https://example.com/page-with-issue"}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="severity" className="block text-xl font-bold">
            Severity <span className={"text-destructive"}>*</span>
          </label>
          <p className="text-sm text-gray-500 mb-1">
            Choose the severity of the issue.
          </p>
          <Select value={severity || "low"} onValueChange={setSeverity}>
            <SelectTrigger className="w-full mb-8">
              <SelectValue placeholder="Select severity" />
            </SelectTrigger>
            <SelectContent>
              {severityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mb-4">
          <label htmlFor="impact" className="block text-xl font-bold">
            Impact
          </label>
          <p className="text-sm text-gray-500 mb-1">
            Describe how this issue affects users, particularly those with
            disabilities.
          </p>
          <Textarea
            id="impact"
            value={impact}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setImpact(e.target.value)
            }
            rows={3}
            className="mt-1 block w-full mb-8"
            placeholder="Example: Screen reader users cannot understand the content or purpose of the banner image, missing important promotional information."
          />
        </div>
        <div className="mb-4">
          <label htmlFor="suggestedFix" className="block text-xl font-bold">
            Suggested Fix
          </label>
          <p className="text-sm text-gray-500 mb-1">
            Provide a specific recommendation for how to fix this issue.
          </p>
          <Textarea
            id="suggestedFix"
            value={suggestedFix}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setSuggestedFix(e.target.value)
            }
            rows={3}
            className="mt-1 block w-full mb-8"
            placeholder='Example: Add descriptive alt text to the banner image: <img src="banner.jpg" alt="Company promotional banner showing our latest products">'
          />
        </div>
        <Button form="create-issue-form" type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Issue"}
        </Button>
      </form>
      {/*
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          name="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/page"
        />
        <Label htmlFor="selector">Selector</Label>
        <Input
          id="selector"
          name="selector"
          value={selector}
          onChange={(e) => setSelector(e.target.value)}
          placeholder="#main .button"
        />
        <Label htmlFor="code_snippet">Code Snippet</Label>
        <textarea
          id="code_snippet"
          name="code_snippet"
          value={codeSnippet}
          onChange={(e) => setCodeSnippet(e.target.value)}
          className="w-full min-h-28 font-mono rounded-md border border-gray-300 p-2 a11y-focus"
          placeholder="Paste relevant HTML/JSX/CSS..."
        />
        <Label htmlFor="severity">Severity</Label>
        <select
          id="severity"
          name="severity"
          className="w-full h-10 rounded-md border border-gray-300 px-3 a11y-focus"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          {severityOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          className="w-full h-10 rounded-md border border-gray-300 px-3 a11y-focus"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <section
          aria-labelledby="remediation-heading"
          className="bg-card rounded-lg p-4 border border-border"
        >
          <h2 id="remediation-heading" className="text-lg font-semibold mb-4">
            Remediation
          </h2>
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
         WCAG
        <section
          aria-labelledby="wcag-heading"
          className="bg-card rounded-lg p-4 border border-border"
        >
          <h2 id="wcag-heading" className="text-lg font-semibold mb-4">
            WCAG Criteria
          </h2>
          {wcagLoadError && (
            <p role="status" className="text-sm text-red-700 mb-2">
              {wcagLoadError}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <div>
              <Label htmlFor="wcag-version">Version</Label>
              <select
                id="wcag-version"
                className="w-full h-10 rounded-md border border-gray-300 px-3 a11y-focus"
                value={wcagVersionFilter}
                onChange={(e) =>
                  setWcagVersionFilter((e.target.value as any) || "all")
                }
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
                onChange={(e) =>
                  setWcagLevelFilter((e.target.value as any) || "all")
                }
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
          <p className="text-sm text-gray-500 mt-2">
            Select at least one criterion.
          </p>
        </section>

         Attachments
        <section
          aria-labelledby="attachments-heading"
          className="bg-card rounded-lg p-4 border border-border"
        >
          <h2 id="attachments-heading" className="text-lg font-semibold mb-4">
            Attachments
          </h2>
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
              <Button
                type="button"
                onClick={handleUpload}
                disabled={uploading || !filesToUpload}
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
              {uploadError && (
                <span className="text-sm text-red-600" role="status">
                  {uploadError}
                </span>
              )}
            </div>
          </div>
          {screenshots.length > 0 && (
            <div className="mt-3">
              <p className="text-sm mb-2">Uploaded:</p>
              <ul className="list-disc pl-5 text-sm">
                {screenshots.map((u) => (
                  <li key={u} className="break-all">
                    <a
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline"
                    >
                      {u}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

         Tags
        <section
          aria-labelledby="tags-heading"
          className="bg-card rounded-lg p-4 border border-border"
        >
          <h2 id="tags-heading" className="text-lg font-semibold mb-4">
            Tags
          </h2>
          <MultiSelect
            id="tags"
            options={tagOptions}
            selected={tagIds}
            onChangeAction={(arr) => setTagIds(arr as string[])}
            placeholder="Select tags..."
            className="w-full"
          />
          <p className="text-sm text-gray-500 mt-2">
            Tags are optional. This environment may not have predefined tags
            yet.
          </p>
        </section>
      </form>
      <Button form="create-issue-form" type="submit" disabled={submitting}>
        {submitting ? "Creating..." : "Create Issue"}
      </Button>
      <Button type="button" onClick={handleAiAssist} disabled={aiBusy}>
        {aiBusy ? "Working..." : "Generate/Refine with AI"}
      </Button>*/}
    </div>
  );
}

export default IssueForm;
