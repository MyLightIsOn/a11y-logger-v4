import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api";
import { projectQueryKey } from "@/lib/query/use-project-details-query";

/**
 * Mutation hook to delete a Project using the Projects API service.
 * - Accepts a project id (string).
 * - On success, invalidates the projects list and the specific project query.
 */
export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation<null, Error, string>({
    mutationKey: ["projects", "delete"],
    mutationFn: async (id: string) => {
      const res = await projectsApi.deleteProject(id);
      if (!res.success) {
        throw new Error(res.error || "Failed to delete project");
      }
      return null;
    },
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: projectQueryKey(id) }),
      ]);
    },
  });
}
