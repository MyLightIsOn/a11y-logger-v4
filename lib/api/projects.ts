import { BaseApiService, ApiResponse } from "./base";
import { Project } from "@/types/project";
import { QueryParams, CreateRequest, UpdateRequest } from "./types";
import { UUID } from "node:crypto";

/**
 * Simple response format that matches the current API route
 */
interface ProjectsResponse {
  data: Project[];
  count: number;
}

export type CreateProjectRequest = CreateRequest<Project>;
export type UpdateProjectRequest = UpdateRequest<Project>;

/**
 * Projects API service
 */
export class ProjectsApiService extends BaseApiService {
  private readonly basePath = "/projects";

  /**
   * Get all projects with optional query parameters
   */
  async getProjects(
    params?: Pick<QueryParams, "sortBy" | "sortOrder">,
  ): Promise<ApiResponse<ProjectsResponse>> {
    return this.get<ProjectsResponse>(this.basePath, params);
  }

  /**
   * Get a single project by ID
   */
  async getProject(id: UUID): Promise<ApiResponse<Project>> {
    return this.get<Project>(`${this.basePath}/${id}`);
  }

  /**
   * Create a new project
   */
  async createProject(
    project: CreateProjectRequest,
  ): Promise<ApiResponse<Project>> {
    return this.post<Project>(this.basePath, project);
  }

  /**
   * Update an existing project
   */
  async updateProject(
    id: UUID,
    updates: UpdateProjectRequest,
  ): Promise<ApiResponse<Project>> {
    return this.put<Project>(`${this.basePath}/${id}`, updates);
  }

  /**
   * Delete a project
   */
  async deleteProject(id: UUID): Promise<ApiResponse<void>> {
    return this.delete<void>(`${this.basePath}/${id}`);
  }

  // TODO: Add these advanced features when needed:
  // async getProjectWithRelations(id: UUID): Promise<ApiResponse<ProjectWithRelations>>
  // async bulkDeleteProjects(ids: UUID[]): Promise<ApiResponse<{ deletedCount: number }>>
  // async duplicateProject(id: UUID, newName?: string): Promise<ApiResponse<Project>>
  // async searchProjects(query: string): Promise<ApiResponse<ListResponse<Project>>> - can use getProjects with search param instead
}

// Export a singleton instance
export const projectsApi = new ProjectsApiService();
