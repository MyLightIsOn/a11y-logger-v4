import { useCallback, useState } from "react";
import type {
  GenerateIssueInsightsOutput,
  SeveritySuggestion,
} from "@/types/ai";
import type { CriterionRef, WcagVersion } from "@/types/issue";
import {
  dedupeStrings,
  makeCriteriaKey,
  parseCriteriaKey,
} from "@/lib/issues/constants";

export type AiAssistContextInput = {
  description: string; // required prompt text
  url?: string;
  selector?: string;
  code_snippet?: string;
  screenshots?: string[]; // URLs
  tags?: string[];
  severity_hint?: SeveritySuggestion;
  criteria_hints?: CriterionRef[];
  assessment_id?: string;
  wcag_version?: WcagVersion;
};

export type ApplySuggestionsPayload = GenerateIssueInsightsOutput;

export type UseAiAssistOptions = {
  /** Provide the current context from the form to enrich the AI prompt */
  getContext: () => AiAssistContextInput;
  /** Apply non-destructive suggestions to the form (only fill empty fields). */
  applySuggestions: (data: ApplySuggestionsPayload) => void;
};

export function useAiAssist(opts: UseAiAssistOptions) {
  const { getContext, applySuggestions } = opts;

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState(
    "Use AI to suggest fields based on current context.",
  );

  const generate = useCallback(async () => {
    const ctx = getContext();
    if (!ctx?.description || !ctx.description.trim()) {
      setAiError("Please provide a description for AI assist.");
      return;
    }
    setAiBusy(true);
    setAiError(null);
    setAiMessage("Generating suggestions...");
    try {
      const res = await fetch("/api/ai/issue-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: ctx.description,
          url: ctx.url,
          selector: ctx.selector,
          code_snippet: ctx.code_snippet,
          screenshots: ctx.screenshots,
          tags: ctx.tags,
          severity_hint: ctx.severity_hint,
          criteria_hints: ctx.criteria_hints,
          assessment_id: ctx.assessment_id,
          wcag_version: ctx.wcag_version,
        }),
      });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("AI assist is not configured on this environment.");
        }
        const text = await res.text();
        throw new Error(text || `AI request failed (${res.status})`);
      }
      const json = (await res.json()) as GenerateIssueInsightsOutput;

      applySuggestions(json);

      setAiMessage(
        "Suggestions applied. Empty fields were filled; existing values were left unchanged.",
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "AI assist failed";
      setAiError(message);
      setAiMessage(
        "AI assist unavailable. You can continue filling the form manually.",
      );
    } finally {
      setAiBusy(false);
    }
  }, [applySuggestions, getContext]);

  return {
    aiPrompt,
    setAiPrompt,
    aiBusy,
    aiError,
    aiMessage,
    generate,
  } as const;
}

export type AiApplyHelperArgs = {
  current: {
    title?: string;
    description?: string;
    suggested_fix?: string;
    impact?: string;
    severity?: "1" | "2" | "3" | "4";
    criteriaKeys?: string[]; // composite keys version|code
  };
  set: {
    setTitle: (v: string) => void;
    setDescription: (v: string) => void;
    setSuggestedFix: (v: string) => void;
    setImpact: (v: string) => void;
    setSeverity: (v: string) => void;
    setCriteriaKeys: (updater: (prev: string[]) => string[]) => void;
  };
};

/**
 * Helper to perform a non-destructive merge of AI suggestions into the form state.
 */
export function applyAiSuggestionsNonDestructive(
  ai: GenerateIssueInsightsOutput,
  helpers: AiApplyHelperArgs,
) {
  const { current, set } = helpers;
  if (ai.title && !current.title) set.setTitle(ai.title);
  if (ai.description && !current.description)
    set.setDescription(ai.description);
  if (ai.suggested_fix && !current.suggested_fix)
    set.setSuggestedFix(ai.suggested_fix);
  if (ai.impact && !current.impact) set.setImpact(ai.impact);
  if (ai.severity_suggestion && (current.severity ?? "3") === "3")
    set.setSeverity(String(ai.severity_suggestion));

  if (Array.isArray(ai.criteria)) {
    const newKeys = ai.criteria
      .map((c: CriterionRef) =>
        makeCriteriaKey(c.version as WcagVersion, c.code),
      )
      .filter((k: string) => typeof k === "string");
    set.setCriteriaKeys((prev) => {
      const deduped = dedupeStrings([...(prev || []), ...newKeys]);
      // Sort by numeric, dot-aware code within the key (version|code)
      const cmp = (a: string, b: string) => {
        const ac = parseCriteriaKey(a).code;
        const bc = parseCriteriaKey(b).code;
        const as = ac.split(".").map((n) => parseInt(n, 10));
        const bs = bc.split(".").map((n) => parseInt(n, 10));
        for (let i = 0; i < Math.max(as.length, bs.length); i++) {
          const av = as[i] ?? 0;
          const bv = bs[i] ?? 0;
          if (av !== bv) return av - bv;
        }
        return a.localeCompare(b);
      };
      return [...deduped].sort(cmp);
    });
  }
}
