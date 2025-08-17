import type { CriterionRef } from "@/types/issue";
import type React from "react";

// Shared AI-related types for issue insights and service configuration

export type SeveritySuggestion = "1" | "2" | "3" | "4";

export interface GenerateIssueInsightsInput {
  description: string;
  screenshots?: string[]; // URLs
  code_snippet?: string;
  url?: string;
  selector?: string;
  tags?: string[]; // free-text tags as hints
  severity_hint?: SeveritySuggestion;
  criteria_hints?: CriterionRef[]; // preselected hints
  // Context to restrict suggestions
  assessment_id?: import("@/types/common").UUID;
  wcag_version?: import("@/types/issue").WcagVersion; // if provided, restrict criteria to this version
}

export interface GenerateIssueInsightsOutput {
  title: string;
  description: string; // refined
  severity_suggestion: SeveritySuggestion;
  criteria: CriterionRef[]; // validated against allowlist
  suggested_fix: string;
  impact: string;
  tag_suggestions?: string[];
}

export type OpenAiServiceOptions = {
  model?: string;
  timeoutMs?: number; // per request timeout
  maxRetries?: number; // JSON-parse retry count for invalid JSON
  temperature?: number;
  baseUrl?: string; // override for enterprise proxies
};

// UI component props for the AI Assist panel
export type AIAssistPanelProps = {
  aiPrompt: string;
  onAiPromptChangeAction: (value: string) => void;
  aiBusy: boolean;
  onGenerateAction: (e: React.FormEvent) => void;
  aiError?: unknown | null;
  aiMessage?: string | null;
};
