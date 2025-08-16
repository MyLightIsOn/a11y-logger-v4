import { useCallback, useState } from "react";
import { dedupeStrings } from "@/lib/issues/constants";

export type UseFileUploadsOptions = {
  /** Optional path segment to help organize uploads on server/CDN */
  folder?: string;
  /** Callback invoked with the final list of uploaded URLs merged/deduped */
  onUploaded?: (urls: string[]) => void;
};

export function useFileUploads(opts: UseFileUploadsOptions = {}) {
  const { folder = "a11y-logger/issues", onUploaded } = opts;
  const [filesToUpload, setFilesToUpload] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  const upload = useCallback(async () => {
    if (!filesToUpload || filesToUpload.length === 0) return;
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
      const json = await res.json();
      const urls = (json?.data || []).map((it: any) => it.url).filter(Boolean);
      setUploadedUrls((prev) => {
        const merged = dedupeStrings([...(prev || []), ...urls]);
        onUploaded?.(merged);
        return merged;
      });
      setFilesToUpload(null);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("Upload error", e);
      setUploadError(e?.message || "Failed to upload images");
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
