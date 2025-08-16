import { useMutation } from "@tanstack/react-query";
import { issuesApi } from "@/lib/api";
import type { CreateIssueRequest, IssueRead } from "@/types/issue";

/**
 * Mutation hook to create an Issue using the Issues API service.
 * - On success, returns the created IssueRead entity (enriched).
 * - On error, throws an Error with a user-friendly message.
 */
export function useCreateIssueMutation() {
  return useMutation<IssueRead, Error, CreateIssueRequest>({
    mutationKey: ["issues", "create"],
    mutationFn: async (payload: CreateIssueRequest) => {
      const res = await issuesApi.createIssue(payload);
      if (!res.success) {
        // API returns { error: string } for 400 validation failures
        throw new Error(res.error || "Failed to create issue");
      }
      // unwrap
      return res.data as IssueRead;
    },
  });
}
