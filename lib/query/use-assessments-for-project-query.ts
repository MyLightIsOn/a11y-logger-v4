import { useQuery } from "@tanstack/react-query";
import { assessmentsApi } from "@/lib/api";
import type { Assessment } from "@/types/assessment";

/**
 * Fetch all assessments for use in Project assessment selection UIs.
 * Mirrors the base assessments list query, but uses a distinct query key
 * so we can invalidate independently if needed.
 */
export function useAssessmentsForProjectQuery() {
  return useQuery<Assessment[], Error>({
    queryKey: ["assessments", "for-project"],
    queryFn: async () => {
      const res = await assessmentsApi.getAssessments({ sortBy: "created_at", sortOrder: "desc" });
      if (!res.success) {
        throw new Error(res.error || "Failed to load assessments");
      }
      return res.data?.data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
}
