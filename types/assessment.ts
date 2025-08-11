import { UUID } from "@/types/common";

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
