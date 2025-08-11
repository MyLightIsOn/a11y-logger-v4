import { UUID } from "@/types/common";

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
