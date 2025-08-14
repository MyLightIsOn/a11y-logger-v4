// TypeScript
import { NextRequest, NextResponse } from "next/server";
import IssuesAiService from "@/lib/ai/issues-ai";
import { z } from "zod";

// Ensure Node runtime (axios + server env vars)
export const runtime = "nodejs";

const inputSchema = z.object({
  description: z.string().min(1),
  url: z.string().url().optional(),
  selector: z.string().optional(),
  code_snippet: z.string().optional(),
  screenshots: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
  severity_hint: z.enum(["1", "2", "3", "4"]).optional(),
  criteria_hints: z
    .array(
      z.object({
        code: z.string().regex(/^\d+\.\d+\.\d+$/),
        version: z.enum(["2.1", "2.2"]),
      }),
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = inputSchema.parse(body);

    const ai = new IssuesAiService({
      // optional overrides:
      // model: "gpt-4o-mini",
      // timeoutMs: 30000,
      // maxRetries: 1,
      // temperature: 0.2,
    });

    const result = await ai.generateIssueInsights({
      description: input.description,
      url: input.url,
      selector: input.selector,
      code_snippet: input.code_snippet,
      screenshots: input.screenshots,
      tags: input.tags,
      severity_hint: input.severity_hint,
      criteria_hints: input.criteria_hints,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    const message =
      e?.message || (typeof e === "string" ? e : "AI assist failed");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
