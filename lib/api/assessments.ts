import { BaseApiService, ApiResponse } from "./base";
import { Assessment } from "@/types/assessment";
import { QueryParams } from "@/types/api";

/**
 * Simple response format that matches the planned/Projects pattern
 */
export interface AssessmentsResponse {
  data: Assessment[];
  count: number;
}

/**
 * Assessments API service (read-only for now)
 */
export class AssessmentsApiService extends BaseApiService {
  private readonly basePath = "/assessments";

  /**
   * Get all assessments with optional sort params
   * Includes associated tags via many-to-many relationship if available
   */
  async getAssessments(
    params?: Pick<QueryParams, "sortBy" | "sortOrder">,
  ): Promise<ApiResponse<AssessmentsResponse>> {
    return this.get<AssessmentsResponse>(this.basePath, params);
  }
}

// Export a singleton instance
export const assessmentsApi = new AssessmentsApiService();
