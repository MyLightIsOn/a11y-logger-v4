import { useCallback, useState } from "react";
import { dedupeStrings } from "@/lib/issues/constants";

export type UseFileUploadsOptions = {
  /** Optional path segment to help organize uploads on server/CDN */
  folder?: string;
  /** Callback invoked with the final list of uploaded URLs merged/deduped */
  onUploaded?: (urls: string[]) => void;
};

// Expected shape of the uploads API response (normalized by our API)
type UploadApiItem = { url?: string; public_id?: string; format?: string };
type UploadApiResponse = { data?: UploadApiItem[] };

export function useFileUploads(opts: UseFileUploadsOptions = {}) {
  const { folder = "a11y-logger/issues", onUploaded } = opts;
  const [filesToUpload, setFilesToUpload] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  const upload = useCallback(async (): Promise<string[] | undefined> => {
    if (!filesToUpload || filesToUpload.length === 0) return undefined;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      Array.from(filesToUpload).forEach((f) => form.append("files", f));
      if (folder) form.append("folder", folder);

      const res = await fetch("/api/uploads/images", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Upload failed (${res.status})`);
      }
      const json: UploadApiResponse = await res.json();
      const urls = (json?.data ?? [])
        .map((it) => it.url)
        .filter((u): u is string => typeof u === "string" && u.length > 0);

      let mergedOut: string[] = [];
      setUploadedUrls((prev) => {
        const merged = dedupeStrings([...(prev || []), ...urls]);
        mergedOut = merged;
        onUploaded?.(merged);
        return merged;
      });

      setFilesToUpload(null);
      return urls;
    } catch (e: unknown) {
      console.error("Upload error", e);
      const message =
        e instanceof Error ? e.message : "Failed to upload images";
      setUploadError(message);
      return undefined;
    } finally {
      setUploading(false);
    }
  }, [filesToUpload, folder, onUploaded]);
  return {
    filesToUpload,
    setFilesToUpload,
    uploading,
    uploadError,
    uploadedUrls,
    upload,
  } as const;
}
