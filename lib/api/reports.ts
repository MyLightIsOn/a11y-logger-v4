import { BaseApiService, ApiResponse } from "./base";
import type { Report } from "@/lib/validation/report";

export type GenerateReportRequest = {
  mode?: "master" | "personas";
  includePatterns?: boolean;
};

export interface ReportListItem {
  id: string;
  assessment_id: string;
  created_at: string;
}

export interface ReportListResponse {
  data: ReportListItem[];
  count: number;
}

export class ReportsApiService extends BaseApiService {
  private readonly basePath = "/reports";

  /** GET /api/reports */
  async listAll(): Promise<ApiResponse<ReportListResponse>> {
    return this.get<ReportListResponse>(this.basePath);
  }

  /** POST /api/reports/[assessmentId] */
  async generateReport(
    assessmentId: string,
    payload: GenerateReportRequest = { mode: "master" },
  ): Promise<ApiResponse<Report>> {
    const mode = payload.mode ?? "master";
    return this.post<Report>(`${this.basePath}/${assessmentId}`, { ...payload, mode });
  }

  /** POST /api/reports/[assessmentId]/save */
  async saveReport(
    assessmentId: string,
    report: Report,
  ): Promise<ApiResponse<{ id: string }>> {
    return this.post<{ id: string }>(`${this.basePath}/${assessmentId}/save`, report);
  }

  /** GET /api/reports/[assessmentId] (latest) */
  async getLatest(assessmentId: string): Promise<ApiResponse<Report>> {
    return this.get<Report>(`${this.basePath}/${assessmentId}`);
  }
}

export const reportsApi = new ReportsApiService();
