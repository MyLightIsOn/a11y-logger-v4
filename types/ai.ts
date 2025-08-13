import type { CriterionRef } from "@/types/issue";

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
