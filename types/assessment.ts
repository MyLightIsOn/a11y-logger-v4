import { UUID } from "@/types/common";
import { Tag } from "./tag";
/**
 * Type definitions for Assessment entities
 */

/**
 * Interface for Assessment entity
 * Matches DB schema and existing UI usage.
 */
export interface Assessment {
  id: UUID;
  name: string;
  description?: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  user_id: UUID;
  wcag_version: import("./issue").WcagVersion; // "2.0" | "2.1" | "2.2"
  tags?: Tag[];
}

/**
 * Counts of issues by severity for an Assessment.
 */
export interface AssessmentIssueCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  /** Convenience total = critical + high + medium + low */
  total: number;
}

/**
 * Assessment object augmented with issue severity statistics.
 */
export type AssessmentWithStats = Assessment & {
  issue_counts: AssessmentIssueCounts;
};
