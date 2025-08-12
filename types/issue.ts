import { Severity, IssueStatus, UUID } from "@/types/common";
import { Tag } from "./tag";

/**
 * Type definitions for Issue entities
 */

/**
 * Interface for Issue entity
 */
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
  criteria?: string;
  status: IssueStatus;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}
