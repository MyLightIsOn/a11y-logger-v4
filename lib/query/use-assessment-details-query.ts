import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assessmentsApi } from "@/lib/api";
import type { Assessment } from "@/types/assessment";
import type { Issue } from "@/types/issue";

// Query keys
export type AssessmentQueryKey = ["assessments", { id: string }];
export const assessmentQueryKey = (id: string): AssessmentQueryKey => [
  "assessments",
  { id },
];

export type AssessmentIssuesQueryKey = [
  "assessments",
  { id: string },
  "issues",
];
export const assessmentIssuesQueryKey = (
  id: string,
): AssessmentIssuesQueryKey => ["assessments", { id }, "issues"];

export interface AssessmentIssuesStats {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface UseAssessmentDetailsResult {
  assessment?: Assessment;
  issues: Issue[];
  stats?: AssessmentIssuesStats & { total: number };
  isLoading: boolean;
  isFetching: boolean;
  error?: Error;
  refetch: () => Promise<void>;
  deleteAssessment: {
    mutate: () => void;
    isPending: boolean;
    error?: Error | undefined;
  };
}

/**
 * useAssessmentDetails(id)
 * - Fetches Assessment details and related Issues+stats in parallel
 * - Exposes a combined loading/error state and a refetch helper
 * - Provides an optimistic deleteAssessment mutation that updates caches
 */
export function useAssessmentDetails(id?: string): UseAssessmentDetailsResult {
  const queryClient = useQueryClient();
  const enabled = Boolean(id && id.length > 0);

  // Fetch the assessment entity
  const assessmentQuery = useQuery<
    Assessment,
    Error,
    Assessment,
    AssessmentQueryKey
  >({
    queryKey: assessmentQueryKey(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("Assessment ID is required");
      const res = await assessmentsApi.getAssessment(id);
      if (!res.success) {
        throw new Error(res.error || "Failed to load assessment");
      }
      return res.data as Assessment;
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch issues for this assessment and severity stats
  const issuesQuery = useQuery<
    { data: Issue[]; stats: AssessmentIssuesStats; count: number },
    Error,
    { data: Issue[]; stats: AssessmentIssuesStats; count: number },
    AssessmentIssuesQueryKey
  >({
    queryKey: assessmentIssuesQueryKey(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("Assessment ID is required");
      const res = await assessmentsApi.getAssessmentIssues(id);
      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to load assessment issues");
      }
      return res.data;
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });

  const isLoading = assessmentQuery.isLoading || issuesQuery.isLoading;
  const isFetching = assessmentQuery.isFetching || issuesQuery.isFetching;
  const errorOut: Error | undefined =
    assessmentQuery.error ?? issuesQuery.error ?? undefined;

  const refetch = async () => {
    await Promise.all([assessmentQuery.refetch(), issuesQuery.refetch()]);
  };

  // Optimistic delete mutation
  const deleteMutation = useMutation<
    unknown,
    Error,
    void,
    {
      prevAssessment?: Assessment;
      prevIssues?: {
        data: Issue[];
        stats: AssessmentIssuesStats;
        count: number;
      };
      prevList?: Assessment[];
    }
  >({
    mutationKey: ["assessments", "delete", { id }],
    mutationFn: async () => {
      if (!id) throw new Error("Assessment ID is required");
      const res = await assessmentsApi.deleteAssessment(id);
      if (!res.success) {
        throw new Error(res.error || "Failed to delete assessment");
      }
      return null;
    },
    onMutate: async () => {
      if (!id) return;
      // Cancel outgoing queries to avoid race conditions
      await Promise.all([
        queryClient.cancelQueries({ queryKey: assessmentQueryKey(id) }),
        queryClient.cancelQueries({ queryKey: assessmentIssuesQueryKey(id) }),
        queryClient.cancelQueries({ queryKey: ["assessments"] }),
      ]);

      // Snapshot previous cache values for rollback
      const prevAssessment = queryClient.getQueryData<Assessment>(
        assessmentQueryKey(id),
      );
      const prevIssues = queryClient.getQueryData<{
        data: Issue[];
        stats: AssessmentIssuesStats;
        count: number;
      }>(assessmentIssuesQueryKey(id));
      const prevList = queryClient.getQueryData<Assessment[]>(["assessments"]);

      // Optimistically remove from caches
      queryClient.setQueryData(assessmentQueryKey(id), undefined);
      queryClient.setQueryData(assessmentIssuesQueryKey(id), undefined);
      if (prevList) {
        queryClient.setQueryData<Assessment[]>(
          ["assessments"],
          prevList.filter((a) => a.id !== id),
        );
      }

      return { prevAssessment, prevIssues, prevList };
    },
    onError: (_err, _vars, ctx) => {
      if (!id || !ctx) return;
      // Rollback caches
      if (ctx.prevAssessment !== undefined) {
        queryClient.setQueryData(assessmentQueryKey(id), ctx.prevAssessment);
      }
      if (ctx.prevIssues !== undefined) {
        queryClient.setQueryData(assessmentIssuesQueryKey(id), ctx.prevIssues);
      }
      if (ctx.prevList !== undefined) {
        queryClient.setQueryData(["assessments"], ctx.prevList);
      }
    },
    onSuccess: async () => {
      // Invalidate related caches to ensure consistency
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["assessments"] }),
        queryClient.invalidateQueries({
          queryKey: assessmentQueryKey(id ?? ""),
        }),
        queryClient.invalidateQueries({
          queryKey: assessmentIssuesQueryKey(id ?? ""),
        }),
      ]);
    },
  });

  const stats = issuesQuery.data?.stats
    ? {
        ...issuesQuery.data.stats,
        total:
          issuesQuery.data.stats.critical +
          issuesQuery.data.stats.high +
          issuesQuery.data.stats.medium +
          issuesQuery.data.stats.low,
      }
    : undefined;

  return {
    assessment: assessmentQuery.data,
    issues: issuesQuery.data?.data ?? [],
    stats,
    isLoading,
    isFetching,
    error: errorOut,
    refetch,
    deleteAssessment: {
      mutate: () => deleteMutation.mutate(),
      isPending: deleteMutation.isPending,
      error: (deleteMutation.error ?? undefined) as Error | undefined,
    },
  };
}
