import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api";
import type { ProjectWithRelations } from "@/lib/api/projects";

export type ProjectQueryKey = ["projects", { id: string }];

export const projectQueryKey = (id: string): ProjectQueryKey => [
  "projects",
  { id },
];

interface UseProjectDetailsParams {
  id?: string;
  enabled?: boolean;
  options?: Omit<
    UseQueryOptions<ProjectWithRelations, Error, ProjectWithRelations, ProjectQueryKey>,
    "queryKey" | "queryFn" | "enabled"
  >;
}

/**
 * Fetch a single Project with relations by ID using React Query.
 * - Returns the Project entity possibly including related assessments and tags.
 * - Disables query when id is undefined or empty.
 */
export function useProjectDetails({ id, enabled, options }: UseProjectDetailsParams) {
  const isEnabled = Boolean(id && id.length > 0) && (enabled ?? true);

  return useQuery<ProjectWithRelations, Error, ProjectWithRelations, ProjectQueryKey>({
    queryKey: projectQueryKey(id ?? ""),
    queryFn: async () => {
      if (!id) {
        throw new Error("Project ID is required");
      }
      const res = await projectsApi.getProject(id);
      if (!res.success) {
        throw new Error(res.error || "Failed to load project");
      }
      return res.data as ProjectWithRelations;
    },
    enabled: isEnabled,
    staleTime: 1000 * 60 * 5,
    ...(options ?? {}),
  });
}
