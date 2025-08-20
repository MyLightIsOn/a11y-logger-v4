import { useMutation } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api";
import type { Project } from "@/types/project";
import type { CreateProjectRequest } from "@/lib/api/projects";

/**
 * Mutation hook to create a Project using the Projects API service.
 * - On success, returns the created Project entity.
 * - On error, throws an Error with a user-friendly message.
 */
export function useCreateProjectMutation() {
  return useMutation<Project, Error, CreateProjectRequest>({
    mutationKey: ["projects", "create"],
    mutationFn: async (payload: CreateProjectRequest) => {
      const res = await projectsApi.createProject(payload);
      if (!res.success) {
        throw new Error(res.error || "Failed to create project");
      }
      return res.data as Project;
    },
  });
}
