import { BaseApiService, ApiResponse } from "./base";
import { Issue, CreateIssueRequest, IssueRead } from "@/types/issue";
import { QueryParams } from "@/types/api";

/**
 * Simple response format mirroring existing list endpoints
 */
export interface IssuesResponse {
  data: Issue[];
  count: number;
}

/**
 * Issues API service
 * - getIssues: list (optionally can request criteria in future via includeCriteria)
 * - createIssue: create and receive enriched Issue (criteria + criteria_codes)
 */
export class IssuesApiService extends BaseApiService {
  private readonly basePath = "/issues";

  /**
   * Get all issues with optional sort params
   * Includes associated tags if available
   * Note: includeCriteria is accepted for forward-compatibility; server may ignore it until wired.
   */
  async getIssues(
    params?: Pick<QueryParams, "sortBy" | "sortOrder"> & { includeCriteria?: boolean }
  ): Promise<ApiResponse<IssuesResponse>> {
    return this.get<IssuesResponse>(this.basePath, params);
  }

  /**
   * Create a new issue
   * Returns the created issue enriched with criteria arrays as IssueRead
   */
  async createIssue(payload: CreateIssueRequest): Promise<ApiResponse<IssueRead>> {
    return this.post<IssueRead>(this.basePath, payload);
  }
}

// Export a singleton instance
export const issuesApi = new IssuesApiService();
