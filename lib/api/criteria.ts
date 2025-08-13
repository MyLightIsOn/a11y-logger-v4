import { BaseApiService, ApiResponse } from "./base";
import type { WcagCriterion } from "@/types/issue";

export interface CriteriaResponse {
  data: WcagCriterion[];
  count: number;
}

export class CriteriaApiService extends BaseApiService {
  private readonly basePath = "/wcag/criteria";

  async getCriteria(): Promise<ApiResponse<CriteriaResponse>> {
    return this.get<CriteriaResponse>(this.basePath);
  }
}

export const criteriaApi = new CriteriaApiService();
