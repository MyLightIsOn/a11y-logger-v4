import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api";
import type { Project } from "@/types/project";
import type { UpdateProjectRequest } from "@/lib/api/projects";
import { projectQueryKey } from "@/lib/query/use-project-details-query";

export interface UpdateProjectVariables {
  id: string;
  payload: UpdateProjectRequest;
}

/**
 * Mutation hook to update a Project using the Projects API service.
 * - Accepts an object with the target project `id` and the patch `payload`.
 * - On success, returns the updated Project entity.
 * - Invalidates project detail and list queries to ensure fresh data.
 */
export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation<Project, Error, UpdateProjectVariables>({
    mutationKey: ["projects", "update"],
    mutationFn: async ({ id, payload }: UpdateProjectVariables) => {
      const res = await projectsApi.updateProject(id, payload);
      if (!res.success) {
        throw new Error(res.error || "Failed to update project");
      }
      return res.data as Project;
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectQueryKey(variables.id) }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
      ]);
    },
  });
}
