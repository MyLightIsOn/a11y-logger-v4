import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { issuesApi } from "@/lib/api";
import type { IssueRead } from "@/types/issue";

export type IssueQueryKey = ["issues", { id: string }];

export const issueQueryKey = (id: string): IssueQueryKey => ["issues", { id }];

interface UseIssueQueryParams {
  id?: string;
  includeCriteria?: boolean;
  enabled?: boolean;
  options?: Omit<
    UseQueryOptions<IssueRead, Error, IssueRead, IssueQueryKey>,
    "queryKey" | "queryFn" | "enabled"
  >;
}

/**
 * Fetch a single Issue by ID using React Query.
 * - Returns IssueRead (enriched with criteria/tags when provided by API)
 * - Disables query when id is undefined or empty
 */
export function useIssueQuery({
  id,
  includeCriteria = true,
  enabled,
  options,
}: UseIssueQueryParams) {
  const isEnabled = Boolean(id && id.length > 0) && (enabled ?? true);

  return useQuery<IssueRead, Error, IssueRead, IssueQueryKey>({
    queryKey: issueQueryKey(id ?? ""),
    queryFn: async () => {
      if (!id) {
        // Should not be called when disabled, but type-safety guard
        throw new Error("Issue ID is required");
      }
      const res = await issuesApi.getIssue(id, { includeCriteria });
      if (!res.success) {
        throw new Error(res.error || "Failed to load issue");
      }
      return res.data as IssueRead;
    },
    enabled: isEnabled,
    staleTime: 1000 * 60 * 5,
    ...(options ?? {}),
  });
}
