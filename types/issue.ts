import { Severity, IssueStatus, UUID } from "@/types/common";
import { Tag } from "./tag";

/**
 * Consolidated Issue types module
 * - Keeps legacy Issue interface (used by current UI and reads)
 * - Adds WCAG and create-request types introduced in Phase 1
 */

// Legacy Issue entity (as currently returned/consumed by list views)
export interface Issue {
  id: UUID;
  title: string;
  description?: string;
  severity: Severity;
  suggested_fix?: string;
  impact?: string;
  url?: string;
  selector?: string;
  code_snippet?: string;
  screenshots: string[];
  // Legacy free-text criteria; kept for backward compatibility with current UI
  criteria?: string;
  status: IssueStatus;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

// Normalized WCAG linkage types
export type WcagVersion = "2.0" | "2.1" | "2.2";

/** Canonical WCAG criterion as stored/returned from DB (one row per version). */
export interface WcagCriterion {
  code: string; // e.g., "1.4.3"
  name: string; // e.g., "Contrast (Minimum)"
  level: "A" | "AA" | "AAA";
  version: WcagVersion;
}

/** Lightweight reference used by create requests. */
export interface CriterionRef {
  code: string;
  version: WcagVersion;
}

/** Rich criteria item included on reads when aggregated from DB. */
export interface IssueCriteriaItem {
  code: string;
  name: string;
  level: "A" | "AA" | "AAA";
  version: WcagVersion;
}

/**
 * Read shape for Issues when aggregated with criteria.
 * criteria_codes is a convenience list (e.g., ["1.4.3", "2.4.7"]).
 * criteria is the rich set with version/level/name for rendering.
 */
export interface IssueRead {
  id: UUID;
  title: string;
  description?: string;
  severity: Severity;
  suggested_fix?: string;
  impact?: string;
  url?: string;
  selector?: string;
  code_snippet?: string;
  screenshots: string[];
  status: IssueStatus;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  criteria_codes?: string[];
  criteria?: IssueCriteriaItem[];
}

/** Create request type for Issues (normalized criteria and optional tag IDs). */
export interface CreateIssueRequest {
  title: string;
  description?: string;
  severity: Severity;
  status: IssueStatus;
  suggested_fix?: string;
  impact?: string;
  url?: string;
  selector?: string;
  code_snippet?: string;
  screenshots?: string[];
  tag_ids?: UUID[];
  criteria: CriterionRef[];
}
