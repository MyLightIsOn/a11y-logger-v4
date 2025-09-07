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

  // List published versions for a VPAT
  async listVersions(vpatId: UUID): Promise<ApiResponse<VpatVersion[]>> {
    return super.get<VpatVersion[]>(`${this.basePath}/${vpatId}/versions`);
  }

  // Get a single published version by ID
  async getVersion(versionId: UUID): Promise<ApiResponse<VpatVersion>> {
    return super.get<VpatVersion>(`/vpat_versions/${versionId}`);
  }
}

// Export a singleton instance for convenience
export const vpatsApi = new VpatsApiService();
