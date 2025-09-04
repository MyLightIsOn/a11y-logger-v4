import { BaseApiService, ApiResponse } from "./base";
import type { Report } from "@/lib/validation/report";

export type GenerateReportRequest = {
  mode?: "master" | "personas";
  includePatterns?: boolean;
};

export class ReportsApiService extends BaseApiService {
  private readonly basePath = "/reports";

  /** POST /api/reports/[assessmentId] */
  async generateReport(
    assessmentId: string,
    payload: GenerateReportRequest = { mode: "master" },
  ): Promise<ApiResponse<Report>> {
    const mode = payload.mode ?? "master";
    return this.post<Report>(`${this.basePath}/${assessmentId}`, { ...payload, mode });
  }

  /** GET /api/reports/[assessmentId] (latest) */
  async getLatest(assessmentId: string): Promise<ApiResponse<Report>> {
    return this.get<Report>(`${this.basePath}/${assessmentId}`);
  }
}

export const reportsApi = new ReportsApiService();
