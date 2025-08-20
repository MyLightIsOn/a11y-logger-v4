import { BaseApiService, ApiResponse } from "./base";
import { Assessment } from "@/types/assessment";
import { QueryParams } from "@/types/api";
import type { WcagVersion } from "@/types/issue";

/**
 * Simple response format that matches the planned/Projects pattern
 */
export interface AssessmentsResponse {
  data: Assessment[];
  count: number;
}

/** Lightweight request type for updating an Assessment */
export type UpdateAssessmentRequest = {
  name?: string;
  description?: string;
  wcag_version?: WcagVersion;
};

/**
 * Assessments API service
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

  /** Get a single assessment by ID */
  async getAssessment(id: string): Promise<ApiResponse<Assessment>> {
    return this.get<Assessment>(`${this.basePath}/${id}`);
  }

  /** Update an assessment by ID */
  async updateAssessment(
    id: string,
    payload: UpdateAssessmentRequest,
  ): Promise<ApiResponse<Assessment>> {
    return this.put<Assessment>(`${this.basePath}/${id}`, payload);
  }

  /** Delete an assessment by ID */
  async deleteAssessment(id: string): Promise<ApiResponse<null>> {
    return this.delete<null>(`${this.basePath}/${id}`);
  }
}

// Export a singleton instance
export const assessmentsApi = new AssessmentsApiService();
