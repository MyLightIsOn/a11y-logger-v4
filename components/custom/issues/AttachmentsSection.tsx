"use client";

import React from "react";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import ErrorAlert from "@/components/ui/error-alert";
import type { AttachmentsSectionProps } from "@/types/uploads";

export function AttachmentsSection({
  filesToUpload,
  onFilesChangeAction,
  uploading,
  uploadError,
  screenshots,
}: AttachmentsSectionProps) {
  const [screenshotPreviews, setScreenshotPreviews] = React.useState<string[]>(
    [],
  );

  React.useEffect(() => {
    if (!filesToUpload || filesToUpload.length === 0) {
      setScreenshotPreviews([]);
      return;
    }
    const urls = Array.from(filesToUpload).map((file) =>
      URL.createObjectURL(file),
    );
    setScreenshotPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [filesToUpload]);

  const handleDeleteScreenshot = (index: number) => {
    if (!filesToUpload) return;
    const dt = new DataTransfer();
    Array.from(filesToUpload).forEach((file, i) => {
      if (i !== index) dt.items.add(file);
    });
    onFilesChangeAction(dt.files);
  };

  return (
    <section
      aria-labelledby="attachments-heading"
      className="bg-card rounded-lg p-4 border border-border"
    >
      <h2 id="attachments-heading" className="text-lg font-semibold mb-4">
        Attachments
      </h2>
      <div>
        <Label htmlFor="screenshots" className="block text-xl font-bold mb-2">
          Screenshots
        </Label>

        {screenshotPreviews.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {screenshotPreviews.map((preview, index) => (
              <div key={index} className="relative group">
                <Image
                  src={preview}
                  alt={`Screenshot ${index + 1}`}
                  width={300}
                  height={160}
                  className="h-40 w-full object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteScreenshot(index)}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Delete screenshot ${index + 1}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-1">
          <label
            htmlFor="screenshots"
            className="flex justify-center px-6 pt-5 pb-6 border-2 border-primary border-dashed rounded-md cursor-pointer hover:border-button-background"
          >
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600">
                <span>Upload screenshots</span>
                <input
                  id="screenshots"
                  type="file"
                  multiple
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => onFilesChangeAction(e.target.files)}
                />
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          </label>
        </div>

        {uploading && (
          <p className="mt-2 text-sm text-gray-500">Uploading images...</p>
        )}

        {uploadError && <ErrorAlert message={uploadError} />}
      </div>
      {screenshots.length > 0 && (
        <div className="mt-3">
          <p className="text-sm mb-2">Uploaded:</p>
          <ul className="list-disc pl-5 text-sm">
            {screenshots.map((u) => (
              <li key={u} className="break-all">
                <a
                  href={u}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
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
