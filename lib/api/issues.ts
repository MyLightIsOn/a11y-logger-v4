import { BaseApiService, ApiResponse } from "./base";
import { Issue } from "@/types/issue";
import { QueryParams } from "@/types/api";

/**
 * Simple response format mirroring existing list endpoints
 */
export interface IssuesResponse {
  data: Issue[];
  count: number;
}

/**
 * Issues API service (read-only for now)
 */
export class IssuesApiService extends BaseApiService {
  private readonly basePath = "/issues";

  /**
   * Get all issues with optional sort params
   * Includes associated tags if available
   */
  async getIssues(
    params?: Pick<QueryParams, "sortBy" | "sortOrder">
  ): Promise<ApiResponse<IssuesResponse>> {
    return this.get<IssuesResponse>(this.basePath, params);
  }
}

// Export a singleton instance
export const issuesApi = new IssuesApiService();
