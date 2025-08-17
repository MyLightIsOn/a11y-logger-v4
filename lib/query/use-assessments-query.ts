import { useQuery } from "@tanstack/react-query";
import { assessmentsApi } from "@/lib/api";
import type { Assessment } from "@/types/assessment";

export function useAssessmentsQuery() {
  return useQuery<Assessment[], Error>({
    queryKey: ["assessments"],
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
