import { UUID } from "@/types/common";
import { Assessment } from "./assessment";
import { Tag } from "./tag";
/**
 * Type definitions for Project entities
 * Based on the API documentation
 */

/**
 * Interface for Project entity
 */
export interface Project {
  id: UUID;
  name: string;
  description?: string;
  created_at: string; // ISO timestamp
  updated_at: string;
  tags?: Tag[];
}

export type ProjectWithRelations = Project & {
  assessments: Assessment[];
  tags: Tag[];
};
