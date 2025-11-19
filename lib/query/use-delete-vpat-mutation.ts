import { useMutation, useQueryClient } from "@tanstack/react-query";
import { vpatsApi } from "@/lib/api";
import type { UUID } from "@/types/common";

/**
 * Mutation hook to delete a VPAT by ID.
 * - Invalidates VPAT list, the specific VPAT, rows, versions, and related queries on success.
 */
export function useDeleteVpatMutation() {
  const queryClient = useQueryClient();
  return useMutation<null, Error, UUID>({
    mutationKey: ["vpats", "delete"],
    mutationFn: async (vpatId: UUID) => {
      const res = await vpatsApi.deleteVpat(vpatId);
      if (!res.success) {
        throw new Error(res.error || "Failed to delete VPAT");
      }
      return null;
    },
    onSuccess: async (_data, vpatId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["vpats"] }),
        queryClient.invalidateQueries({ queryKey: ["vpat", vpatId] }),
        queryClient.invalidateQueries({ queryKey: ["vpat", "rows", vpatId] }),
        queryClient.invalidateQueries({ queryKey: ["vpat", "versions", vpatId] }),
        queryClient.invalidateQueries({ queryKey: ["vpat", "issues-summary", vpatId] }),
      ]);
    },
  });
}
