import type { UUID } from "@/types/common";

/**
 * VPAT domain types
 * Extracted from lib/api/vpats.ts to share across app layers.
 */
export type VpatStatus = "draft" | "published";

export interface Vpat {
  id: UUID;
  project_id: UUID;
  title: string;
  description?: string | null;
  status: VpatStatus;
  created_by: UUID;
  created_at: string; // ISO
  updated_at: string; // ISO
  current_version_id?: UUID | null;
}

/** View row from v_vpat_current used for list cards */
export interface VpatCurrentView {
  vpat_id: UUID;
  project_id: UUID;
  title: string;
  description?: string | null;
  status: VpatStatus;
  created_by: UUID;
  created_at: string;
  updated_at: string;
  current_version_id?: UUID | null;
  version_number?: number | null;
  published_at?: string | null;
  published_by?: UUID | null;
}

export interface VpatListResponse {
  data: VpatCurrentView[];
  count: number;
}

export type ConformanceValue =
  | "Supports"
  | "Partially Supports"
  | "Does Not Support"
  | "Not Applicable"
  | "Not Evaluated";

export interface VpatRowDraft {
  id: UUID;
  vpat_id: UUID;
  wcag_criterion_id: UUID;
  conformance?: ConformanceValue | null;
  remarks?: string | null;
  related_issue_ids?: UUID[] | null;
  related_issue_urls?: string[] | null;
  last_generated_at?: string | null;
  last_edited_by?: UUID | null;
  updated_at: string;
}

export interface VpatVersion {
  id: UUID;
  vpat_id: UUID;
  version_number: number;
  published_by: UUID;
  published_at: string;
  wcag_scope: unknown; // jsonb
  criteria_rows: unknown; // jsonb
  export_artifacts?: unknown | null; // jsonb
}

// Requests
export interface CreateVpatRequest {
  projectId: UUID;
  title: string;
  description?: string;
}

export interface UpdateVpatRequest {
  title?: string;
  description?: string | null;
}

export interface SaveVpatRowRequest {
  conformance: ConformanceValue | null;
  remarks: string | null;
  related_issue_ids?: UUID[];
  related_issue_urls?: string[];
}

export interface ValidateVpatResponse {
  ok: boolean;
  issues: Array<{
    criterionId: UUID;
    code?: string;
    message: string;
    field?: "conformance" | "remarks" | "related_issue_ids" | "related_issue_urls";
  }>;
}

export interface GenerateVpatRowResponse {
  status: "UPDATED" | "INSERTED" | "SKIPPED";
  row: VpatRowDraft | null;
  warning?: string;
}
