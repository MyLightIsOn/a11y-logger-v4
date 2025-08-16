import { useQuery } from "@tanstack/react-query";
import { criteriaApi } from "@/lib/api/criteria";
import type { WcagCriterion } from "@/types/issue";

export function useWcagCriteriaQuery() {
  return useQuery<WcagCriterion[], Error, WcagCriterion[], ["wcagCriteria"]>({
    queryKey: ["wcagCriteria"] as const,
    queryFn: async (): Promise<WcagCriterion[]> => {
      const res = await criteriaApi.getCriteria();
      if (!res.success) {
        throw new Error(res.error || "Failed to load WCAG criteria");
      }
      return res.data?.data ?? [];
    },
    staleTime: 1000 * 60 * 60, // 1 hour, criteria rarely change
  });
}
