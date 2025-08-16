import { UUID } from "@/types/common";
import type { Option } from "@/types/options";

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

export type TagsSectionProps = {
  isLoading: boolean;
  error: Error | null | undefined;
  options: Option[];
  selected: string[];
  onSelectedChangeAction: (arr: string[]) => void;
};
