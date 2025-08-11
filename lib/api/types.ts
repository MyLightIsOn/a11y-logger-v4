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
 * API list response wrapper
 */
export interface ListResponse<T> {
  data: T[];
  count?: number;
  totalPages?: number;
  currentPage?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

/**
 * Create request type (omits id, created_at, updated_at)
 */
export type CreateRequest<T> = Omit<T, "id" | "created_at" | "updated_at">;

/**
 * Update request type (omits id, created_at, updated_at and makes all fields optional)
 */
export type UpdateRequest<T> = Partial<
  Omit<T, "id" | "created_at" | "updated_at">
>;

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
