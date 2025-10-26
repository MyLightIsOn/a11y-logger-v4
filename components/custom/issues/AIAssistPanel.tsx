"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import AiIcon from "@/components/custom/AiIcon";
import type { AIAssistPanelProps } from "@/types/ai";

import {
  useAiAssist,
  applyAiSuggestionsNonDestructive,
} from "@/lib/hooks/use-ai-assist";

export function AIAssistPanel({
  watch,
  getValues,
  setValue,
  assessments,
}: AIAssistPanelProps) {
  // Determine effective WCAG version from selected assessment
  const selectedAssessment = watch("assessment_id") as unknown as
    | import("@/types/common").UUID
    | undefined;
  const assessmentObj = (assessments || []).find(
    (a) => a.id === selectedAssessment,
  );
  const effectiveWcagVersion = assessmentObj?.wcag_version;

  const { aiPrompt, setAiPrompt, aiBusy, aiError, aiMessage, generate } =
    useAiAssist({
      getContext: () => {
        const v = getValues();
        return {
          description: (
            aiPrompt ||
            v.description ||
            ""
          ).toString(),
          url: v.url || undefined,
          selector: v.selector || undefined,
          code_snippet: v.code_snippet || undefined,
          wcag_version: effectiveWcagVersion,
        };
      },
      applySuggestions: (json) => {
        const v = getValues();
        const criteriaArr = (
          Array.isArray(v.criteria) ? v.criteria : []
        ) as Array<{ version?: string; code?: string }>;
        const currentKeys = criteriaArr
          .map((c) =>
            c?.version && c?.code ? `${c.version}|${c.code}` : undefined,
          )
          .filter(Boolean) as string[];

        return applyAiSuggestionsNonDestructive(json, {
          current: {
            title: v.title,
            description: v.description,
            suggested_fix: v.suggested_fix,
            impact: v.impact,
            severity: v.severity,
            criteriaKeys: currentKeys,
          },
          set: {
            setTitle: (val) => setValue("title", val, { shouldDirty: true }),
            setDescription: (val) =>
              setValue("description", val, { shouldDirty: true }),
            setSuggestedFix: (val) =>
              setValue("suggested_fix", val, { shouldDirty: true }),
            setImpact: (val) => setValue("impact", val, { shouldDirty: true }),
            setSeverity: (val) =>
              setValue("severity", val as import("@/types/common").Severity, { shouldDirty: true }),
            setCriteriaKeys: (updater) => {
              const nextKeys = updater(currentKeys);
              const mapped = nextKeys
                .map((k) => {
                  const [ver, code] = (k || "").split("|", 2);
                  const v = ver as import("@/types/issue").WcagVersion;
                  if ((v === "2.0" || v === "2.1" || v === "2.2") && code)
                    return { version: v, code };
                  return undefined;
                })
                .filter(Boolean) as Array<{ version: string; code: string }>;
              setValue(
                "criteria",
                mapped as Array<{
                  version: import("@/types/issue").WcagVersion;
                  code: string;
                }>,
                {
                  shouldDirty: true,
                  shouldValidate: true,
                },
              );
            },
          },
        });
      },
    });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    void generate();
  };

  return (
    <div className="mb-4 bg-tags/80 dark:bg-tags/10 p-6 rounded-md border-button-background border">
      <div className={"text-md font-medium text-gray-700 dark:text-white mb-4"}>
        <p className={"mb-4"}>
          You can enter a description here and press the Generate Issue Button
          to have the rest of the issue filled out by the AI. For the best
          results, please include the following information:
        </p>
        <ol className={"mb-5 pl-10 list-decimal"}>
          <li>
            <span className={"font-bold pl-1"}>Component</span>: What element is
            affected? (e.g., &#34;Search button&#34;)
          </li>
          <li>
            <span className={"font-bold pl-1"}>Location</span>: Where does the
            issue occur? (e.g., &#34;Homepage&#34;)
          </li>
          <li>
            <span className={"font-bold pl-1"}>What&apos;s Happening?</span>:
            What is wrong? (e.g., &#34;Not focusable via keyboard&#34;)
          </li>
          <li>
            <span className={"font-bold pl-1"}>
              Expected Behavoir (Optional)
            </span>
            : What is the expected behavoir?
          </li>
        </ol>
        <p className={"flex items-center mb-4"}>
          <AlertTriangle className="7 w-7 fill-amber-200 mr-2 dark:stroke-black" />
          AI assistance will only fill in fields you&apos;ve left empty; it will
          not overwrite values you&apos;ve already entered.
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
        rows={4}
        placeholder="Example: The search button on the homepage is not operable via keyboard. It should be focusable and activated using the Enter key."
        className="mt-1 block w-full mb-4 placeholder:text-gray-400"
        aria-describedby="ai-assist-help"
        value={aiPrompt}
        onChange={(e) => {
          setAiPrompt(e.target.value);
        }}
      />
      <p id="ai-assist-help" className="sr-only">
        Enter an issue description to help the AI generate suggestions.
      </p>
      {aiError && (
        <p className="text-sm mt-2 mb-2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
          {String(aiError)}
        </p>
      )}
      {aiMessage && (
        <p className="text-sm text-gray-700 mb-2" aria-live="polite">
          {aiMessage}
        </p>
      )}
      <Button
        className={"bg-button-background text-md gap-4"}
        type="button"
        onClick={handleGenerate}
        disabled={aiBusy}
        aria-describedby="ai-status"
      >
        {aiBusy ? "Working..." : "Generate with AI"} <AiIcon />
      </Button>
      <span id="ai-status" role="status" aria-live="polite" className="sr-only">
        {aiBusy ? "Generating suggestions from AI..." : ""}
      </span>
    </div>
  );
}

export default AIAssistPanel;
