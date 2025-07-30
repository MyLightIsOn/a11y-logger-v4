import { UUID } from "@/types/common";
import { Issue } from "./issue";
import { Project } from "./project";
import { Tag } from "./tag";

/**
 * Type definitions for Assessment entities
 */

/**
 * Interface for Assessment entity
 */
export interface Assessment {
  id: UUID;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export type AssessmentWithRelations = Assessment & {
  projects: Project[];
  tags: Tag[];
  issues: Issue[];
};
