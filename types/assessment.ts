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
  wcag_version: import("./issue").WcagVersion; // "2.0" | "2.1" | "2.2"
  tags?: Tag[];
}
