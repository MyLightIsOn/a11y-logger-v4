import axios from "axios";
import type { OpenAiServiceOptions } from "@/types/ai";

// Lightweight, reusable JSON-oriented model invocation wrapper (Phase 2 - Step 9)
// - Configurable temperature, max tokens, model
// - Accepts system + user messages
// - Enforces JSON via response_format and validates JSON client-side
// - One automated repair attempt on invalid JSON (strip code fences, extract JSON slice, remove trailing commas)

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type InvokeJsonOptions = OpenAiServiceOptions & {
  maxTokens?: number;
};

export type ModelUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type InvokeJsonResult<T> = {
  parsed: T;
  raw: string;
  usage?: ModelUsage;
};

const DEFAULT_MODEL = "gpt-4o-mini";

function stripCodeFences(text: string): string {
  // Remove common markdown fences like ```json ... ``` or ``` ... ```
  // Keep inner content if present.
  if (!text) return text;
  const fence = /```[a-zA-Z0-9]*\n([\s\S]*?)```/u;
  const m = text.match(fence);
  if (m && m[1]) return m[1].trim();
  return text.trim();
}

function extractJsonSlice(text: string): string {
  // Try to find the first opening bracket and the last matching closing bracket.
  const firstObj = text.indexOf("{");
  const firstArr = text.indexOf("[");
  let start = -1;
  let end = -1;
  if (firstObj !== -1 && (firstArr === -1 || firstObj < firstArr)) {
    start = firstObj;
    end = text.lastIndexOf("}");
  } else if (firstArr !== -1) {
    start = firstArr;
    end = text.lastIndexOf("]");
  }
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text;
}

function removeTrailingCommas(text: string): string {
  // Replace trailing commas before } or ]
  return text.replace(/,\s*([}\]])/gu, "$1");
}

function attemptRepair(text: string): string {
  let s = stripCodeFences(text);
  s = extractJsonSlice(s);
  s = removeTrailingCommas(s);
  return s.trim();
}

function estimateTokens(str: string): number {
  return Math.ceil((str?.length || 0) / 4);
}

// Minimal shape of OpenAI response we care about
type OpenAIChatResponse = {
  choices?: Array<{
    message?: { role?: string; content?: string | null };
  }>;
  usage?: ModelUsage;
};

export class ModelJsonClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number; // transport retries
  private readonly temperature: number;
  private readonly baseUrl: string;

  constructor(opts: OpenAiServiceOptions = {}) {
    const key = process.env.OPEN_AI_KEY;
    if (!key) {
      throw new Error(
        "OPEN_AI_KEY is not set. Please configure the environment variable for server-side AI features.",
      );
    }
    this.apiKey = key;
    this.model = opts.model || DEFAULT_MODEL;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.maxRetries = Math.max(0, opts.maxRetries ?? 1);
    this.temperature = opts.temperature ?? 0.5; // Step 9 default 0.5 (0.4–0.6 range)
    this.baseUrl = opts.baseUrl || "https://api.openai.com/v1";
  }

  async invokeJson<T>(
    systemPrompt: string,
    userPrompt: string,
    options: InvokeJsonOptions = {},
  ): Promise<InvokeJsonResult<T>> {
    const temperature =
      typeof options.temperature === "number"
        ? options.temperature
        : this.temperature;
    const max_tokens = options.maxTokens;

    const doRequest = async () => {
      const res = await axios.post<OpenAIChatResponse>(
        `${this.baseUrl}/chat/completions`,
        {
          model: options.model || this.model,
          temperature,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          ...(typeof max_tokens === "number" ? { max_tokens } : {}),
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: options.timeoutMs ?? this.timeoutMs,
        },
      );
      const data = res.data;
      const usage = data?.usage;
      const raw = data?.choices?.[0]?.message?.content ?? "";
      return { raw: raw ?? "", usage };
    };

    let attempt = 0;
    let lastErr: unknown;
    while (attempt <= this.maxRetries) {
      try {
        const { raw, usage } = await doRequest();
        // Parse JSON with one repair attempt if needed
        try {
          const parsed = JSON.parse(raw) as T;
          this.logUsage(systemPrompt, userPrompt, raw, usage);
          return { parsed, raw, usage };
        } catch {
          const repaired = attemptRepair(raw);
          try {
            const parsed = JSON.parse(repaired) as T;
            this.logUsage(systemPrompt, userPrompt, raw, usage);
            return { parsed, raw: repaired, usage };
          } catch {
            // escalate after one repair attempt per transport attempt
            throw new Error(
              "Model returned invalid JSON and automated repair failed.",
            );
          }
        }
      } catch (err) {
        lastErr = err;
        const delay = 500 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        attempt += 1;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("Model call failed");
  }

  private logUsage(
    systemPrompt: string,
    userPrompt: string,
    modelText: string,
    usage?: ModelUsage,
  ) {
    const promptTokens =
      usage?.prompt_tokens ?? estimateTokens(systemPrompt + "\n" + userPrompt);
    const completionTokens = usage?.completion_tokens ?? estimateTokens(modelText);
    const totalTokens = usage?.total_tokens ?? promptTokens + completionTokens;
    console.log(
      `AI usage — model=${this.model} prompt=${promptTokens} completion=${completionTokens} total=${totalTokens}`,
    );
  }
}

// Convenience functional API
export async function invokeModelJson<T>(args: {
  system: string;
  user: string;
  options?: InvokeJsonOptions;
}): Promise<InvokeJsonResult<T>> {
  const client = new ModelJsonClient(args.options);
  return client.invokeJson<T>(args.system, args.user, args.options);
}
