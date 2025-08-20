import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { assessmentsApi } from "@/lib/api";
import type { Assessment } from "@/types/assessment";

export type AssessmentQueryKey = ["assessments", { id: string }];

export const assessmentQueryKey = (id: string): AssessmentQueryKey => [
  "assessments",
  { id },
];

interface UseAssessmentQueryParams {
  id?: string;
  enabled?: boolean;
  options?: Omit<
    UseQueryOptions<Assessment, Error, Assessment, AssessmentQueryKey>,
    "queryKey" | "queryFn" | "enabled"
  >;
}

/**
 * Fetch a single Assessment by ID using React Query.
 * - Returns Assessment entity
 * - Disables query when id is undefined or empty
 */
export function useAssessmentQuery({ id, enabled, options }: UseAssessmentQueryParams) {
  const isEnabled = Boolean(id && id.length > 0) && (enabled ?? true);

  return useQuery<Assessment, Error, Assessment, AssessmentQueryKey>({
    queryKey: assessmentQueryKey(id ?? ""),
    queryFn: async () => {
      if (!id) {
        throw new Error("Assessment ID is required");
      }
      const res = await assessmentsApi.getAssessment(id);
      if (!res.success) {
        throw new Error(res.error || "Failed to load assessment");
      }
      return res.data as Assessment;
    },
    enabled: isEnabled,
    staleTime: 1000 * 60 * 5,
    ...(options ?? {}),
  });
}
