import axios from "axios";
import { z } from "zod";
import { getCriteriaAllowlist, wcagVersionEnum } from "@/lib/validation/issues";
import type { CriterionRef, WcagVersion } from "@/types/issue";
import type {
  GenerateIssueInsightsInput,
  GenerateIssueInsightsOutput,
  OpenAiServiceOptions,
  SeveritySuggestion,
} from "@/types/ai";

// Zod schema for the AI JSON result
const criterionRefSchema = z.object({
  code: z
    .string()
    .min(3)
    .regex(/^\d+\.\d+\.\d+$/, { message: "Code must be d.d.d (e.g., 1.4.3)" }),
  version: wcagVersionEnum,
});

const aiInsightsSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(5000),
    severity_suggestion: z.enum(["1", "2", "3", "4"]),
    criteria: z.array(criterionRefSchema).default([]),
    suggested_fix: z.string().min(1).max(5000),
    impact: z.string().min(1).max(5000),
    tag_suggestions: z.array(z.string().min(1)).optional(),
  })
  .strict();

// System prompt tailored for WCAG-oriented issue enrichment
const SYSTEM_PROMPT = `
You are an accessibility issue enrichment assistant. Your task is to generate structured insights for a web accessibility issue. 
Return only strict JSON matching this TypeScript type (no markdown, no extra text):
{
  "title": string,                    // short, WCAG-friendly, mention what is wrong in the title. e.g., "Missing alt text"
  "description": string,              // refined interpretation, do not include impact
  "severity_suggestion": "1"|"2"|"3"|"4", // 1=highest impact, 4=lowest
  "criteria": Array<{ code: string; version: "2.0"|"2.1"|"2.2" }>,
  "suggested_fix": string,            // practical remediation; include code examples if helpful
  "impact": string,                   // up to ~100 words explaining why it matters
}
Rules:
- Criteria must be valid WCAG success criteria codes for the Assessment's WCAG version if provided; otherwise, criteria may be from WCAG 2.0/2.1/2.2.
- Do not include any fields not defined in the schema.
- Output must be valid JSON (no trailing commas, no comments).
`;

function buildUserPrompt(input: GenerateIssueInsightsInput): string {
  const parts: string[] = [];
  parts.push(`User description: ${input.description}`);
  if (input.url) parts.push(`Page URL: ${input.url}`);
  if (input.selector) parts.push(`CSS/XPath selector: ${input.selector}`);
  if (input.code_snippet) parts.push(`Code snippet:\n${input.code_snippet}`);
  if (input.screenshots?.length)
    parts.push(`Screenshot URLs: ${input.screenshots.join(", ")}`);
  if (input.tags?.length) parts.push(`Tag hints: ${input.tags.join(", ")}`);
  if (input.severity_hint)
    parts.push(`Severity hint (1-4): ${input.severity_hint}`);
  if (input.criteria_hints?.length)
    parts.push(
      `Criteria hints: ${input.criteria_hints
        .map((c) => `${c.version}|${c.code}`)
        .join(", ")}`,
    );
  if (input.wcag_version)
    parts.push(
      `Assessment WCAG version: ${input.wcag_version}. Only propose criteria from this version.`,
    );
  parts.push(
    "Return JSON only. Ensure criteria codes are valid for WCAG 2.0/2.1/2.2. Keep the impact under ~100 words.",
  );
  return parts.join("\n");
}

// Utility to pick a reasonable model; keep overridable via constructor
const DEFAULT_MODEL = "gpt-4o-mini"; // lightweight, good for JSON tasks

/** Estimate tokens roughly as 4 chars per token (very rough). */
function estimateTokens(str: string): number {
  return Math.ceil((str?.length || 0) / 4);
}

// Minimal shape of OpenAI Chat Completions response used by this service
// (we only access `usage` and `choices[0].message.content`).
type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

export class IssuesAiService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly temperature: number;
  private readonly baseUrl: string;

  constructor(opts: OpenAiServiceOptions = {}) {
    const { serverEnv } = require("@/lib/env");
    const key: string | undefined = serverEnv.OPEN_AI_KEY;
    if (!key) {
      throw new Error(
        "OPEN_AI_KEY is not set. Please configure the environment variable for server-side AI features.",
      );
    }
    this.apiKey = key;
    this.model = opts.model || DEFAULT_MODEL;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.maxRetries = Math.max(0, opts.maxRetries ?? 1);
    this.temperature = opts.temperature ?? 0.2;
    this.baseUrl = opts.baseUrl || "https://api.openai.com/v1";
  }

  /** Generic helper to run a JSON-constrained chat completion with one retry on invalid JSON. */
  private async chatJSON(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<{
    jsonText: string;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  }> {
    const doRequest = async () => {
      try {
        const res = await axios.post<OpenAIChatResponse>(
          `${this.baseUrl}/chat/completions`,
          {
            model: this.model,
            temperature: this.temperature,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
            },
            timeout: this.timeoutMs,
          },
        );
        const data = res.data;
        const usage = data?.usage;
        const content = data?.choices?.[0]?.message?.content ?? "";
        return { jsonText: content ?? "", usage };
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status;
          const d = err.response?.data;
          let text: string | undefined;
          if (typeof d === "string") text = d;
          else if (d) {
            try {
              text = JSON.stringify(d);
            } catch {
              text = String(d);
            }
          }
          throw new Error(
            `OpenAI API error ${status ?? "unknown"}: ${text ?? err.message}`,
          );
        }
        throw err;
      }
    };

    let attempt = 0;
    let lastErr: unknown;
    while (attempt <= this.maxRetries) {
      try {
        const result = await doRequest();
        return result;
      } catch (err) {
        lastErr = err;
        // simple backoff: 500ms * 2^attempt
        const delay = 500 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        attempt += 1;
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error("OpenAI request failed");
  }

  /**
   * Generate structured insights for an issue. Validates and sanitizes the AI output.
   * - Ensures criteria are valid against the shared allowlist (wcag-criteria.json).
   * - Deduplicates criteria and filters invalid entries.
   */
  async generateIssueInsights(
    input: GenerateIssueInsightsInput,
  ): Promise<GenerateIssueInsightsOutput> {
    const system = SYSTEM_PROMPT;
    const user = buildUserPrompt(input);

    // Run the model (with retry on transport via chatJSON). We'll add a secondary JSON-parse retry below.
    const { jsonText, usage } = await this.chatJSON(system, user);

    const allow = getCriteriaAllowlist();

    const parseWithValidation = (text: string) => {
      // Parse raw JSON, then validate with Zod, then verify criteria against allowlist
      const parsed = aiInsightsSchema.parse(JSON.parse(text));
      const deduped: CriterionRef[] = [];
      const seen = new Set<string>();
      for (const c of parsed.criteria ?? []) {
        const key = `${c.version}|${c.code}`;
        if (!allow.has(key)) continue; // filter unknown
        if (seen.has(key)) continue; // dedupe
        seen.add(key);
        // Normalize version type
        const v = c.version as WcagVersion;
        deduped.push({ code: c.code, version: v });
      }
      const out: GenerateIssueInsightsOutput = {
        title: parsed.title,
        description: parsed.description,
        severity_suggestion: parsed.severity_suggestion as SeveritySuggestion,
        criteria: deduped,
        suggested_fix: parsed.suggested_fix,
        impact: parsed.impact,
        tag_suggestions: parsed.tag_suggestions,
      };
      return out;
    };

    let output: GenerateIssueInsightsOutput | null = null;
    let lastErr: unknown;

    // First attempt to parse
    try {
      output = parseWithValidation(jsonText);
    } catch (err) {
      lastErr = err;
      // Retry once with a stricter instruction appended to user content
      if (this.maxRetries > 0) {
        const retryUser = `${user}\n\nIMPORTANT: Return only valid JSON matching the schema. Do not include markdown fences.`;
        const { jsonText: retryText, usage: retryUsage } = await this.chatJSON(
          system,
          retryUser,
        );
        try {
          output = parseWithValidation(retryText);
          // Merge usage (best effort)
          this.logUsage(user, jsonText, usage, retryUsage);
          return output;
        } catch (retryErr) {
          lastErr = retryErr;
        }
      }
    }

    // Log token usage for the initial attempt if we haven't logged yet
    this.logUsage(user, jsonText, usage);

    if (!output) {
      throw lastErr instanceof Error
        ? lastErr
        : new Error("Failed to parse AI insights JSON");
    }
    return output;
  }

  private logUsage(
    userPrompt: string,
    modelText: string,
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    },
    retryUsage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    },
  ) {
    const promptTokens = usage?.prompt_tokens ?? estimateTokens(userPrompt);
    const completionTokens =
      usage?.completion_tokens ?? estimateTokens(modelText);
    const totalTokens = usage?.total_tokens ?? promptTokens + completionTokens;

    const line = `AI usage — model=${this.model} prompt=${promptTokens} completion=${completionTokens} total=${totalTokens}`;
    console.log(line);

    if (retryUsage) {
      const rPrompt = retryUsage?.prompt_tokens ?? 0;
      const rComp = retryUsage?.completion_tokens ?? 0;
      const rTotal = retryUsage?.total_tokens ?? rPrompt + rComp;
      console.log(
        `AI usage (retry) — prompt=${rPrompt} completion=${rComp} total=${rTotal}`,
      );
    }
  }
}

export default IssuesAiService;
