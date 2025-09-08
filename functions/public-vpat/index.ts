// Supabase Edge Function: public-vpat
// GET /edge/public/vpats/{versionId}?password=...
// Validates vpat_share (visibility/password, not revoked) and returns wcag_scope and criteria_rows.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";


type Visibility = "private" | "public" | "password";

interface VpatShareRow {
  version_id: string;
  visibility: Visibility;
  show_issue_links: boolean | null;
  password_hash: string | null;
  revoked_at: string | null;
}

interface VpatVersionPayload {
  id: string;
  wcag_scope: unknown; // keep unknown to avoid any; returned as-is
  criteria_rows: Array<{
    code: string;
    name: string;
    level: string;
    conformance: string | null;
    remarks: string | null;
    related_issue_titles?: string[] | null;
    related_issue_urls?: string[] | null;
  }>;
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json; charset=utf-8" },
    ...init,
  });
}

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Expect path: /edge/public/vpats/{versionId}
    const versionId = pathParts[pathParts.length - 1] as string;
    if (!versionId || versionId.length < 10) {
      return jsonResponse({ error: "Invalid version id" }, { status: 400 });
    }

    const password = url.searchParams.get("password");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Service configuration missing" }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1) Fetch share row and validate
    const { data: share, error: shareErr } = await supabase
      .from("vpat_share")
      .select("version_id, visibility, show_issue_links, password_hash, revoked_at")
      .eq("version_id", versionId)
      .maybeSingle<VpatShareRow>();
    if (shareErr) {
      console.error("shareErr", shareErr);
      return jsonResponse({ error: "Internal error" }, { status: 500 });
    }

    if (!share || share.revoked_at) {
      return jsonResponse({ error: "Link not available" }, { status: 404 });
    }

    if (share.visibility === "private") {
      return jsonResponse({ error: "Forbidden" }, { status: 403 });
    }

    if (share.visibility === "password") {
      if (!password || !share.password_hash) {
        return jsonResponse({ error: "Password required" }, { status: 401 });
      }
      const ok = await bcrypt.compare(password, share.password_hash);
      if (!ok) {
        return jsonResponse({ error: "Invalid password" }, { status: 403 });
      }
    }

    // 2) Fetch published payload
    const { data: versionRow, error: verErr } = await supabase
      .from("vpat_version")
      .select("id, wcag_scope, criteria_rows")
      .eq("id", versionId)
      .maybeSingle<VpatVersionPayload>();
    if (verErr) {
      console.error("verErr", verErr);
      return jsonResponse({ error: "Internal error" }, { status: 500 });
    }
    if (!versionRow) {
      return jsonResponse({ error: "Not found" }, { status: 404 });
    }

    const showIssueLinks = share.show_issue_links !== false; // default true
    let rows = versionRow.criteria_rows;
    if (!showIssueLinks) {
      rows = rows.map((r) => ({
        ...r,
        related_issue_titles: null,
        related_issue_urls: null,
      }));
    }

    return jsonResponse({
      version_id: versionRow.id,
      wcag_scope: versionRow.wcag_scope,
      criteria_rows: rows,
    });
  } catch (e) {
    console.error("public-vpat error", e);
    return jsonResponse({ error: "Internal server error" }, { status: 500 });
  }
});
