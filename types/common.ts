export type UUID = string;
export type Severity = "1" | "2" | "3" | "4";
export type IssueStatus = "open" | "closed" | "archive";

/**
 * Represents a successful API response
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Represents an error API response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  data?: undefined;
}

/**
 * Type that represents either a successful response or an error response
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
