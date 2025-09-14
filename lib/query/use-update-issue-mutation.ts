import { useMutation, useQueryClient } from "@tanstack/react-query";
import { issuesApi } from "@/lib/api";
import type { IssueRead, UpdateIssueRequest } from "@/types/issue";
import { issueQueryKey } from "@/lib/query/use-issue-query";

export interface UpdateIssueVariables {
  id: string;
  payload: UpdateIssueRequest;
}

/**
 * Mutation hook to update an Issue using the Issues API service.
 * - Accepts an object with the target issue `id` and the patch `payload`.
 * - On success, returns the updated IssueRead entity (enriched) and updates the React Query cache
 *   so the detail page shows fresh data immediately after navigation.
 */
export function useUpdateIssueMutation() {
  const queryClient = useQueryClient();

  return useMutation<IssueRead, Error, UpdateIssueVariables>({
    mutationKey: ["issues", "update"],
    mutationFn: async ({ id, payload }: UpdateIssueVariables) => {
      const res = await issuesApi.updateIssue(id, payload);
      if (!res.success) {
        throw new Error(res.error || "Failed to update issue");
      }
      return res.data as IssueRead;
    },
    onSuccess: (data) => {
      // 1) Prime the detail cache with the updated entity so first render is fresh
      if (data?.id) {
        queryClient.setQueryData(issueQueryKey(data.id), data);
      }
      // 2) Invalidate related queries so they refetch in the background
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}
