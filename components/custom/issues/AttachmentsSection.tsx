"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export type AttachmentsSectionProps = {
  filesToUpload: FileList | null;
  onFilesChange: (files: FileList | null) => void;
  uploading: boolean;
  uploadError: string | null;
  onUpload: () => void;
  screenshots: string[];
};

export function AttachmentsSection({ filesToUpload, onFilesChange, uploading, uploadError, onUpload, screenshots }: AttachmentsSectionProps) {
  return (
    <section aria-labelledby="attachments-heading" className="bg-card rounded-lg p-4 border border-border">
      <h2 id="attachments-heading" className="text-lg font-semibold mb-4">
        Attachments
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <Label htmlFor="screenshots">Screenshots</Label>
          <input
            id="screenshots"
            type="file"
            multiple
            accept="image/*"
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer focus:outline-dashed focus:outline-4 focus:outline-offset-4 focus:outline-primary"
            onChange={(e) => onFilesChange(e.target.files)}
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={onUpload} disabled={uploading || !filesToUpload} aria-describedby="upload-status">
            {uploading ? "Uploading..." : "Upload"}
          </Button>
          <span id="upload-status" role="status" aria-live="polite" className="sr-only">
            {uploading ? "Uploading screenshots..." : ""}
          </span>
          {uploadError && (
            <span className="text-sm text-red-600" role="alert">
              {uploadError}
            </span>
          )}
        </div>
      </div>
      {screenshots.length > 0 && (
        <div className="mt-3">
          <p className="text-sm mb-2">Uploaded:</p>
          <ul className="list-disc pl-5 text-sm">
            {screenshots.map((u) => (
              <li key={u} className="break-all">
                <a href={u} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                  {u}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default AttachmentsSection;
