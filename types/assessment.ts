import { UUID } from "@/types/common";
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
  created_at: string; // ISO timestamp
  updated_at: string;
  tags?: Tag[];
}
