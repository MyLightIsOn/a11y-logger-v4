import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "@/types/common";
import {
  toMarkdown,
  type CriteriaRow,
  type WcagScope,
} from "@/lib/vpat/export";

/**
 * GET /api/vpat_versions/[versionId]/download?format=md
 * Renders a VPAT version as a downloadable artifact. Markdown supported for now.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { versionId: UUID } },
) {
  try {
    const supabase = await createClient();

    // Auth (must be signed in; RLS further scopes per project)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const versionId = params.versionId as UUID;

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "md").toLowerCase();

    // Optional: PDF (time-box). Leave a clear TODO and return 501 for now.
    if (format === "pdf") {
      // TODO: Implement HTML->PDF rendering using Playwright or a serverless-friendly library.
      // Consider caching and storing artifact URL in vpat_version.export_artifacts.
      return NextResponse.json(
        { error: "PDF export not implemented yet" },
        { status: 501 },
      );
    }

    if (format !== "md") {
      return NextResponse.json(
        { error: "Unsupported format" },
        { status: 400 },
      );
    }

    // Fetch version snapshot; select only fields we need for export + title from parent VPAT
    const { data: version, error: verErr } = await supabase
      .from("vpat_version")
      .select(
        "id, vpat_id, version_number, published_at, wcag_scope, criteria_rows, vpat(title)",
      )
      .eq("id", versionId)
      .maybeSingle();

    if (verErr) throw verErr;
    if (!version) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // We need the VPAT title for filename and heading. If row-level select alias didn't include it, fetch explicitly.
    type VersionRow = {
      id: UUID;
      vpat_id: UUID;
      version_number: number | null;
      published_at: string | null;
      wcag_scope: WcagScope;
      criteria_rows: CriteriaRow[] | null;
      vpat?: { title?: string } | null;
    };
    const v = version as VersionRow;
    let title: string | undefined;
    if (v.vpat && typeof v.vpat.title === "string") {
      title = v.vpat.title;
    } else {
      const { data: vpatRow, error: vpatErr } = await supabase
        .from("vpat")
        .select("title")
        .eq("id", (version as { vpat_id: UUID }).vpat_id)
        .maybeSingle();
      if (vpatErr) throw vpatErr;
      title = vpatRow?.title || "VPAT";
    }

    const md = toMarkdown({
      title,
      version_number: v.version_number ?? null,
      published_at: v.published_at ?? null,
      wcag_scope: v.wcag_scope,
      criteria_rows: v.criteria_rows || [],
    });

    const safeTitle =
      (title || "vpat")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "vpat";
    const versionNumber = v.version_number ?? null;
    const filename = versionNumber
      ? `${safeTitle}-v${versionNumber}.md`
      : `${safeTitle}.md`;

    return new NextResponse(md, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error downloading VPAT version:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
