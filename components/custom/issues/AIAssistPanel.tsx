"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import AiIcon from "@/components/AiIcon";
import type { AIAssistPanelProps } from "@/types/ai";


export function AIAssistPanel({
  aiPrompt,
  onAiPromptChangeAction,
  aiBusy,
  onGenerateAction,
}: AIAssistPanelProps) {
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
        <p className={"flex items-center mb-4 text-sm"}>
          <AlertTriangle className="h-10 w-10 fill-amber-200 mr-2 dark:stroke-black" />
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
        value={aiPrompt}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          onAiPromptChangeAction(e.target.value)
        }
        rows={4}
        placeholder="Example: The search button on the homepage is not operable via keyboard. It should be focusable and activated using the Enter key."
        className="mt-1 block w-full mb-4"
        aria-describedby="ai-assist-help"
      />
      <p id="ai-assist-help" className="sr-only">
        Enter an issue description to help the AI generate suggestions.
      </p>
      <Button
        className={"bg-button-background text-md gap-4"}
        type="button"
        onClick={onGenerateAction}
        disabled={aiBusy}
        aria-describedby="ai-status"
      >
        {aiBusy ? "Working..." : "Generate/Refine with AI"} <AiIcon />
      </Button>
      <span id="ai-status" role="status" aria-live="polite" className="sr-only">
        {aiBusy ? "Generating suggestions from AI..." : ""}
      </span>
    </div>
  );
}

export default AIAssistPanel;
