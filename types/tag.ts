import { UUID } from "@/types/common";
import { Assessment } from "./assessment";
import { Issue } from "./issue";
import { Project } from "./project";

/**
 * Type definitions for Tag entities
 * Based on the API documentation
 */

/**
 * Interface for Tag entity
 */
export interface Tag {
  id: UUID;
  label: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export type TagWithRelations = Tag & {
  projects: Project[];
  assessments: Assessment[];
  issues: Issue[];
};
