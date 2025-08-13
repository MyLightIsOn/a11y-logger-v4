import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Basic validation constraints
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

// 10 MB default max
const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Build Cloudinary API signature
function buildSignature(params: Record<string, string>, apiSecret: string) {
  // Cloudinary requires parameters sorted alphabetically and concatenated as key=value pairs joined by &
  const keys = Object.keys(params).sort();
  const toSign = keys.map((k) => `${k}=${params[k]}`).join("&");
  return crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");
}

// Normalize Cloudinary upload response to the contract in the plan
function normalizeItem(cloudRes: any) {
  return {
    url: cloudRes.secure_url || cloudRes.url,
    public_id: cloudRes.public_id,
    width: cloudRes.width,
    height: cloudRes.height,
    format: cloudRes.format,
    bytes: cloudRes.bytes,
  } as {
    url: string;
    public_id: string;
    width?: number;
    height?: number;
    format?: string;
    bytes?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Enforce authentication (same pattern as other routes)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure env vars exist (server-only secrets)
    const cloudName = process.env.CLOUDINARY_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("Cloudinary env vars missing");
      return NextResponse.json(
        { error: "Server misconfiguration: Cloudinary credentials missing" },
        { status: 500 },
      );
    }

    const form = await request.formData();

    // Support multiple files under key "files" and also single under "file"
    const fileEntries: File[] = [];
    const multi = form.getAll("files");
    for (const entry of multi) {
      if (entry instanceof File) fileEntries.push(entry);
    }
    const single = form.get("file");
    if (single instanceof File) fileEntries.push(single);

    if (fileEntries.length === 0) {
      return NextResponse.json(
        { error: "No files provided. Use 'files' (multi) or 'file' (single)." },
        { status: 400 },
      );
    }

    // Optional folder param for organization
    const folder = (form.get("folder") as string) || "a11y-logger/uploads";

    // Validate and upload sequentially (keeps memory lower and simpler error handling)
    const results: any[] = [];

    for (const file of fileEntries) {
      const mime = file.type || "";
      const size = file.size || 0;

      if (!ALLOWED_MIME.has(mime)) {
        return NextResponse.json(
          { error: `Unsupported file type: ${mime}` },
          { status: 400 },
        );
      }

      if (size <= 0 || size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `File too large (max ${Math.floor(MAX_FILE_BYTES / (1024 * 1024))}MB)` },
          { status: 400 },
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const timestamp = Math.floor(Date.now() / 1000).toString();
      // Only include params in signature that Cloudinary expects in signature
      const signParams: Record<string, string> = { folder, timestamp };
      const signature = buildSignature(signParams, apiSecret);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const uploadForm = new FormData();
      uploadForm.append("file", new Blob([buffer], { type: mime }), file.name);
      uploadForm.append("api_key", apiKey);
      uploadForm.append("timestamp", timestamp);
      uploadForm.append("signature", signature);
      uploadForm.append("folder", folder);
      // Set resource_type automatically (images)

      const res = await fetch(uploadUrl, {
        method: "POST",
        body: uploadForm,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Cloudinary upload failed", res.status, errText);
        return NextResponse.json(
          { error: `Cloudinary upload failed: ${res.status}` },
          { status: 502 },
        );
      }

      const json = await res.json();
      results.push(normalizeItem(json));
    }

    // Log upload metrics (Phase 9 alignment)
    try {
      const totalBytes = results.reduce((sum, r) => sum + (r.bytes || 0), 0);
      console.log(
        `uploads/images: user=${user.id} files=${results.length} bytes=${totalBytes}`,
      );
    } catch {}

    return NextResponse.json({ data: results, count: results.length });
  } catch (error) {
    console.error("Error handling image upload:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
