/**
 * Upload-related shared types
 */

/** Subset of Cloudinary upload response fields used by the app */
export interface CloudinaryUploadResponse {
  secure_url?: string;
  url?: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

/** Normalized upload item returned by our API */
export interface NormalizedItem {
  url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

/** Props for the AttachmentsSection client component */
export type AttachmentsSectionProps = {
  filesToUpload: FileList | null;
  onFilesChangeAction: (files: FileList | null) => void;
  uploading: boolean;
  uploadError: string | null;
  screenshots: string[];
};
