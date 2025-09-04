import { useMutation } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api";
import type { Report } from "@/lib/validation/report";

export interface UseGenerateReportResult {
  generate: (options?: { mode?: "master" | "personas"; includePatterns?: boolean }) => void;
  isPending: boolean;
  error?: Error;
}

export function useGenerateReport(assessmentId?: string, onSuccess?: (report: Report) => void): UseGenerateReportResult {
  const mutation = useMutation<Report, Error, { mode?: "master" | "personas"; includePatterns?: boolean } | undefined>({
    mutationKey: ["reports", "generate", { assessmentId }],
    mutationFn: async (vars) => {
      if (!assessmentId) throw new Error("Assessment ID is required");
      const res = await reportsApi.generateReport(assessmentId, {
        mode: vars?.mode ?? "master",
        includePatterns: vars?.includePatterns ?? false,
      });
      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to generate report");
      }
      return res.data as Report;
    },
    onSuccess: (data) => {
      try {
        if (typeof window !== "undefined") {
          const key = `report:${data.assessment_id}`;
          window.sessionStorage.setItem(key, JSON.stringify(data));
        }
      } catch {
        // ignore storage failures
      }
      onSuccess?.(data);
    },
  });

  return {
    generate: (options) => mutation.mutate(options),
    isPending: mutation.isPending,
    error: (mutation.error ?? undefined) as Error | undefined,
  };
}
