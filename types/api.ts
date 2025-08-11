import { UUID } from "@/types/common";

/**
 * Common API request/response types
 */

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Sorting parameters
 */
export interface SortParams {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Filter parameters
 */
export interface FilterParams {
  search?: string;
  tags?: UUID[];
  createdAfter?: string;
  createdBefore?: string;
}

/**
 * Combined query parameters
 */
export interface QueryParams
  extends PaginationParams,
    SortParams,
    FilterParams {}

/**
 * Helpers for entities that support tags:
 * Replace the relation field (e.g., "tags") with tag_ids: UUID[] for input payloads.
 */
export type CreateRequestWithTags<T, TagKey extends keyof T> = Omit<
  T,
  "id" | "created_at" | "updated_at" | TagKey
> & {
  tag_ids?: UUID[];
};

export type UpdateRequestWithTags<T, TagKey extends keyof T> = Partial<
  Omit<T, "id" | "created_at" | "updated_at" | TagKey>
> & {
  tag_ids?: UUID[];
};
