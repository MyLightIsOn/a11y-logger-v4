import { useMutation } from "@tanstack/react-query";
import { issuesApi } from "@/lib/api";
import type { IssueRead, UpdateIssueRequest } from "@/types/issue";

export interface UpdateIssueVariables {
  id: string;
  payload: UpdateIssueRequest;
}

/**
 * Mutation hook to update an Issue using the Issues API service.
 * - Accepts an object with the target issue `id` and the patch `payload`.
 * - On success, returns the updated IssueRead entity (enriched).
 * - On error, throws an Error with a user-friendly message.
 */
export function useUpdateIssueMutation() {
  return useMutation<IssueRead, Error, UpdateIssueVariables>({
    mutationKey: ["issues", "update"],
    mutationFn: async ({ id, payload }: UpdateIssueVariables) => {
      const res = await issuesApi.updateIssue(id, payload);
      if (!res.success) {
        throw new Error(res.error || "Failed to update issue");
      }
      return res.data as IssueRead;
    },
  });
}
