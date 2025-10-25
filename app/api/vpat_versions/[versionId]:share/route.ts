import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "@/types/common";
import bcrypt from "bcryptjs";

/**
 * GET /api/vpat_versions/[versionId]:share
 * Returns current share settings for a VPAT version (owner-scoped; not public view).
 */
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ versionId: UUID }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { versionId: rawVersionId } = await ctx.params;
    const versionId = (rawVersionId as string).split(":")[0] as UUID;

    // Ensure version exists (RLS enforces access)
    const { data: versionRow, error: verErr } = await supabase
      .from("vpat_version")
      .select("id")
      .eq("id", versionId)
      .maybeSingle();
    if (verErr) throw verErr;
    if (!versionRow)
      return NextResponse.json({ error: "Not Found" }, { status: 404 });

    const { data: shareRow, error: shareErr } = await supabase
      .from("vpat_share")
      .select("version_id, visibility, show_issue_links, revoked_at")
      .eq("version_id", versionId)
      .maybeSingle();
    if (shareErr) throw shareErr;

    return NextResponse.json(
      shareRow ?? {
        version_id: versionId,
        visibility: "private",
        show_issue_links: true,
        revoked_at: null,
      },
    );
  } catch (error) {
    console.error("Error fetching share settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/vpat_versions/[versionId]:share
 * Upsert share settings for a VPAT version.
 * Body: { visibility: 'private'|'public'|'password', password?: string, show_issue_links?: boolean, revoke?: boolean }
 * - If revoke is true => set revoked_at=now(), visibility='private', password_hash=null
 * - If visibility='password' and password provided => store bcrypt hash
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ versionId: UUID }> },
) {
  try {
    const supabase = await createClient();

    // Auth (user-scoped; RLS ensures owner access)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { versionId: rawVersionId } = await ctx.params;
    const versionId = (rawVersionId as string).split(":")[0] as UUID;

    // Ensure version exists and belongs to user's project (RLS backed)
    const { data: versionRow, error: verErr } = await supabase
      .from("vpat_version")
      .select("id, vpat(project_id)")
      .eq("id", versionId)
      .maybeSingle();
    if (verErr) throw verErr;
    if (!versionRow) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    type Visibility = "private" | "public" | "password";

    const body = (await request.json().catch(() => ({}))) as {
      visibility?: Visibility;
      password?: string | null;
      show_issue_links?: boolean;
      revoke?: boolean;
    };

    const revoke = body.revoke === true;

    // Fetch existing share row (if any)
    const { data: existingShare, error: shareErr } = await supabase
      .from("vpat_share")
      .select("id, visibility, show_issue_links, password_hash, revoked_at")
      .eq("version_id", versionId)
      .maybeSingle();
    if (shareErr) throw shareErr;

    if (revoke) {
      if (!existingShare) {
        // Nothing to revoke; create a row in revoked/private state so future GETs reflect it
        const { error: insErr } = await supabase.from("vpat_share").insert([
          {
            version_id: versionId,
            visibility: "private",
            password_hash: null,
            show_issue_links: true,
            revoked_at: new Date().toISOString(),
          },
        ]);
        if (insErr) throw insErr;
      } else {
        const { error: updErr } = await supabase
          .from("vpat_share")
          .update({
            visibility: "private",
            password_hash: null,
            revoked_at: new Date().toISOString(),
          })
          .eq("id", existingShare.id);
        if (updErr) throw updErr;
      }

      const { data: updated, error: getErr } = await supabase
        .from("vpat_share")
        .select("version_id, visibility, show_issue_links, revoked_at")
        .eq("version_id", versionId)
        .maybeSingle();
      if (getErr) throw getErr;
      return NextResponse.json({
        version_id: versionId,
        visibility: updated?.visibility ?? "private",
        show_issue_links: updated?.show_issue_links ?? true,
        revoked_at: updated?.revoked_at ?? new Date().toISOString(),
      });
    }

    // Validate visibility
    const visibility = (body.visibility ??
      existingShare?.visibility ??
      "private") as Visibility;
    if (!["private", "public", "password"].includes(visibility)) {
      return NextResponse.json(
        { error: "Invalid visibility" },
        { status: 400 },
      );
    }

    const showIssueLinks =
      typeof body.show_issue_links === "boolean"
        ? body.show_issue_links
        : (existingShare?.show_issue_links ?? true);

    let password_hash: string | null | undefined = undefined;
    if (visibility === "password") {
      if (typeof body.password === "string" && body.password.length > 0) {
        // Hash with bcrypt
        const salt = await bcrypt.genSalt(10);
        password_hash = await bcrypt.hash(body.password, salt);
      } else if (!existingShare?.password_hash) {
        return NextResponse.json(
          { error: "Password required when setting visibility to 'password'" },
          { status: 400 },
        );
      }
    } else {
      password_hash = null; // clear if switching away from password visibility
    }

    if (!existingShare) {
      const { data: inserted, error: insErr } = await supabase
        .from("vpat_share")
        .insert([
          {
            version_id: versionId,
            visibility,
            password_hash: password_hash ?? null,
            show_issue_links: showIssueLinks,
            revoked_at: null,
          },
        ])
        .select("version_id, visibility, show_issue_links, revoked_at")
        .maybeSingle();
      if (insErr) throw insErr;
      return NextResponse.json(
        inserted ?? {
          version_id: versionId,
          visibility,
          show_issue_links: showIssueLinks,
          revoked_at: null,
        },
      );
    }

    const updatePayload: Record<string, unknown> = {
      visibility,
      show_issue_links: showIssueLinks,
      revoked_at: null, // changing settings clears revocation
    };
    if (typeof password_hash !== "undefined") {
      updatePayload.password_hash = password_hash;
    }

    const { data: updated, error: updErr } = await supabase
      .from("vpat_share")
      .update(updatePayload)
      .eq("id", existingShare.id)
      .select("version_id, visibility, show_issue_links, revoked_at")
      .maybeSingle();
    if (updErr) throw updErr;

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating share settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
