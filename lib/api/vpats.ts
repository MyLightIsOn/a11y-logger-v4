import { BaseApiService, ApiResponse } from "./base";
import type { UUID } from "@/types/common";
import type {
  Vpat,
  VpatListResponse,
  VpatRowDraft,
  VpatVersion,
  CreateVpatRequest,
  UpdateVpatRequest,
  SaveVpatRowRequest,
  ValidateVpatResponse,
  GenerateVpatRowResponse,
} from "@/types/vpat";

/**
 * VPATs API service wrapper
 * Matches planned endpoints; some routes will be implemented in later steps.
 */
export class VpatsApiService extends BaseApiService {
  private readonly basePath = "/vpats";

  // Create a new VPAT (draft)
  async create(payload: CreateVpatRequest): Promise<ApiResponse<Vpat>> {
    return this.post<Vpat>(this.basePath, payload);
  }

  // List VPATs scoped to a project (via v_vpat_current)
  async listByProject(projectId: UUID): Promise<ApiResponse<VpatListResponse>> {
    return super.get<VpatListResponse>(this.basePath, { projectId });
  }

  // Get a single VPAT (draft metadata)
  async getVpat(vpatId: UUID): Promise<ApiResponse<Vpat>> {
    return super.get<Vpat>(`${this.basePath}/${vpatId}`);
  }

  // Update title/description for a draft VPAT
  async update(
    vpatId: UUID,
    patch: UpdateVpatRequest,
  ): Promise<ApiResponse<Vpat>> {
    return this.put<Vpat>(`${this.basePath}/${vpatId}`, patch);
  }

  // Get all draft rows for a VPAT
  async getRows(vpatId: UUID): Promise<ApiResponse<VpatRowDraft[]>> {
    return super.get<VpatRowDraft[]>(`${this.basePath}/${vpatId}/rows`);
  }

  // Save/clear a specific row (upsert by vpat_id + wcag_criterion_id)
  async saveRow(
    vpatId: UUID,
    criterionId: UUID,
    payload: SaveVpatRowRequest,
  ): Promise<ApiResponse<VpatRowDraft>> {
    return this.put<VpatRowDraft>(
      `${this.basePath}/${vpatId}/rows/${criterionId}`,
      payload,
    );
  }

  // Validate a draft VPAT (stubbed on server initially)
  async validate(vpatId: UUID): Promise<ApiResponse<ValidateVpatResponse>> {
    return this.post<ValidateVpatResponse>(`${this.basePath}/${vpatId}:validate`);
  }

  // Generate a single row via AI with no-overwrite guard
  async generateRow(
    vpatId: UUID,
    criterionId: UUID,
  ): Promise<ApiResponse<GenerateVpatRowResponse>> {
    return this.post<GenerateVpatRowResponse>(`${this.basePath}/${vpatId}/rows/${criterionId}:generate`);
  }

  // Get project-scoped issues summary for a VPAT (counts by WCAG code)
  async getIssuesSummary(
    vpatId: UUID,
  ): Promise<ApiResponse<{ data: Array<{ code: string; count: number }>; total: number }>> {
    return super.get<{ data: Array<{ code: string; count: number }>; total: number }>(`${this.basePath}/${vpatId}/issues-summary`);
  }

  // List published versions for a VPAT
  async listVersions(vpatId: UUID): Promise<ApiResponse<VpatVersion[]>> {
    return super.get<VpatVersion[]>(`${this.basePath}/${vpatId}/versions`);
  }

  // Get a single published version by ID
  async getVersion(versionId: UUID): Promise<ApiResponse<VpatVersion>> {
    return super.get<VpatVersion>(`/vpat_versions/${versionId}`);
  }

  // Publish the current draft into a new version
  async publish(vpatId: UUID): Promise<ApiResponse<{ version_id: UUID; version_number: number; published_at: string }>> {
    return this.post<{ version_id: UUID; version_number: number; published_at: string }>(`${this.basePath}/${vpatId}:publish`);
  }

  // Get issue IDs for a specific WCAG code within VPAT's project
  async getIssuesByCriterion(
    vpatId: UUID,
    code: string,
  ): Promise<ApiResponse<{ data: string[]; count: number }>> {
    return super.get<{ data: string[]; count: number }>(`${this.basePath}/${vpatId}/criteria/${encodeURIComponent(code)}/issues`);
  }
}

// Export a singleton instance for convenience
export const vpatsApi = new VpatsApiService();
