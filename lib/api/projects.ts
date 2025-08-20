import { BaseApiService, ApiResponse } from "./base";
import { Project } from "@/types/project";
import { Assessment } from "@/types/assessment";
import { QueryParams } from "@/types/api";

/**
 * Simple response format for projects list
 */
export interface ProjectsResponse {
  data: Project[];
  count: number;
}

/** Project details with related assessments flattened */
export type ProjectWithRelations = Project & {
  assessments?: Assessment[];
};

/** Lightweight request type for creating a Project */
export type CreateProjectRequest = {
  name: string;
  description?: string;
  /** Optional tag IDs to associate via join table */
  tag_ids?: string[];
  /** Optional assessment IDs to associate via join table */
  assessment_ids?: string[];
};

/** Lightweight request type for updating a Project */
export type UpdateProjectRequest = {
  name?: string;
  description?: string;
  /** Optional tag IDs to replace the full set for the project */
  tag_ids?: string[];
  /** Optional assessment IDs to replace the full set for the project */
  assessment_ids?: string[];
};

export class ProjectsApiService extends BaseApiService {
  private readonly basePath = "/projects";

  /**
   * Get all projects with optional sort params
   * Server flattens tags; response includes count similar to assessments API
   */
  async getProjects(
    params?: Pick<QueryParams, "sortBy" | "sortOrder">,
  ): Promise<ApiResponse<ProjectsResponse>> {
    return this.get<ProjectsResponse>(this.basePath, params);
  }

  /** Get a single project by ID (includes tags and assessments on server) */
  async getProject(id: string): Promise<ApiResponse<ProjectWithRelations>> {
    return this.get<ProjectWithRelations>(`${this.basePath}/${id}`);
  }

  /** Create a new project */
  async createProject(
    payload: CreateProjectRequest,
  ): Promise<ApiResponse<Project>> {
    return this.post<Project>(this.basePath, payload);
  }

  /** Update a project by ID */
  async updateProject(
    id: string,
    payload: UpdateProjectRequest,
  ): Promise<ApiResponse<Project>> {
    return this.put<Project>(`${this.basePath}/${id}`, payload);
  }

  /** Delete a project by ID */
  async deleteProject(id: string): Promise<ApiResponse<null>> {
    return this.delete<null>(`${this.basePath}/${id}`);
  }
}

// Export a singleton instance
export const projectsApi = new ProjectsApiService();
