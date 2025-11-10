import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api";

/**
 * Mutation hook to delete ALL reports for a given assessment.
 * - Accepts an assessmentId (string).
 * - On success, invalidates generic reports queries if present.
 */
export function useDeleteReportMutation() {
  const queryClient = useQueryClient();
  return useMutation<null, Error, string>({
    mutationKey: ["reports", "delete"],
    mutationFn: async (assessmentId: string) => {
      const res = await reportsApi.deleteReportsForAssessment(assessmentId);
      if (!res.success) {
        throw new Error(res.error || "Failed to delete reports");
      }
      return null;
    },
    onSuccess: async (_data, assessmentId) => {
      // Invalidate any reports-related caches if used elsewhere
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
        queryClient.invalidateQueries({ queryKey: ["reports", { assessmentId }] }),
      ]);
    },
  });
}
