import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "@/types/common";
import { toHtml, type CriteriaRow, type WcagScope } from "@/lib/vpat/export";
import type { ConformanceValue } from "@/types/vpat";

/**
 * GET /api/vpats/[vpatId]/download?format=html
 * Returns a downloadable HTML representation of the current VPAT draft.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ vpatId: UUID }> },
) {
  try {
    const supabase = await createClient();

    // Auth required
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { vpatId: rawVpatId } = await ctx.params;
    const vpatId = (rawVpatId as string).split(":")[0] as UUID;

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "html").toLowerCase();
    if (format !== "html") {
      return NextResponse.json(
        { error: "Unsupported format" },
        { status: 400 },
      );
    }

    // Fetch VPAT title and status (ensure it exists and is accessible)
    const { data: vpatRow, error: vpatErr } = await supabase
      .from("vpat")
      .select("id, title, status")
      .eq("id", vpatId)
      .single();
    if (vpatErr || !vpatRow) {
      return NextResponse.json({ error: "VPAT not found" }, { status: 404 });
    }

    const title: string = (vpatRow as { title?: string }).title || "VPAT";

    // Fetch WCAG criteria reference
    const { data: criteriaRows, error: critErr } = await supabase
      .from("wcag_criteria")
      .select("id, code, name, level");
    if (critErr) throw critErr;

    type WcagRow = {
      id: UUID;
      code: string;
      name: string;
      level: "A" | "AA" | "AAA";
    };

    // Fetch draft rows
    const { data: draftRows, error: draftErr } = await supabase
      .from("vpat_row_draft")
      .select("wcag_criterion_id, conformance, remarks, related_issue_urls")
      .eq("vpat_id", vpatId);
    if (draftErr) throw draftErr;

    type DraftRow = {
      wcag_criterion_id: UUID;
      conformance: ConformanceValue | null;
      remarks: string | null;
      related_issue_urls: string[] | null;
    };

    const byCriterionId = new Map<UUID, DraftRow>();
    for (const r of (draftRows || []) as DraftRow[]) {
      byCriterionId.set(r.wcag_criterion_id, r);
    }

    // Simple scope heuristic (match publish route for consistency)
    const wcag_scope: WcagScope = {
      versions: ["2.0", "2.1", "2.2"],
      levels: { A: true, AA: true, AAA: true },
    };

    // Deduplicate criteria by WCAG code. Prefer the criterion id that has a draft row.
    const groupedByCode = new Map<string, WcagRow[]>();
    for (const c of (criteriaRows || []) as WcagRow[]) {
      const arr = groupedByCode.get(c.code) || [];
      arr.push(c);
      groupedByCode.set(c.code, arr);
    }
    const uniqueCriteria: WcagRow[] = [];
    for (const [code, group] of groupedByCode.entries()) {
      console.log(code);
      let chosen: WcagRow | undefined = group.find((g) =>
        byCriterionId.has(g.id),
      );
      if (!chosen) chosen = group[0];
      uniqueCriteria.push(chosen);
    }

    const criteria_rows: CriteriaRow[] = uniqueCriteria.map((c) => {
      const draft = byCriterionId.get(c.id);
      const conformance: ConformanceValue =
        ((draft?.conformance as ConformanceValue | null) ??
          "Not Evaluated") as ConformanceValue;
      const remarks: string | null = draft?.remarks ?? null;
      // Filter URLs to include only likely issue links (avoid generic page URLs)
      const rawUrls = Array.isArray(draft?.related_issue_urls)
        ? draft!.related_issue_urls!
        : null;
      const filteredUrls = rawUrls
        ? rawUrls.filter(
            (url) =>
              /\/(issues?|bugs|tickets)\//i.test(url) ||
              /github\.com\/.+\/issues\//i.test(url) ||
              /gitlab\.com\/.+\/issues\//i.test(url) ||
              /bitbucket\.org\/.+\/issues\//i.test(url),
          )
        : null;
      const issues =
        filteredUrls && filteredUrls.length > 0
          ? filteredUrls.map((url) => ({ url }))
          : null;
      return {
        code: c.code,
        name: c.name,
        level: c.level,
        conformance,
        remarks,
        issues,
      } satisfies CriteriaRow;
    });

    // Build HTML
    const html = toHtml({
      title,
      version_number: null,
      published_at: null,
      wcag_scope,
      criteria_rows,
    });

    const safeTitle =
      (title || "vpat")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "vpat";
    const filename = `${safeTitle}.html`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });

    return NextResponse.json(
      {
        message:
          "SUCCESS: HTML download initiated. Check your email for the download link.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error downloading VPAT draft as HTML:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
