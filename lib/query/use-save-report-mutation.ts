import { useMutation } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api";
import type { Report } from "@/lib/validation/report";

export interface UseSaveReportResult {
  save: (report: Report) => void;
  isPending: boolean;
  error?: Error;
}

export function useSaveReport(
  assessmentId?: string,
  onSuccess?: (id: string) => void,
): UseSaveReportResult {
  const mutation = useMutation<{ id: string }, Error, Report>({
    mutationKey: ["reports", "save", { assessmentId }],
    mutationFn: async (report) => {
      if (!assessmentId) throw new Error("Assessment ID is required");
      if (!report) throw new Error("Report is required");
      const res = await reportsApi.saveReport(assessmentId, report);
      if (!res.success || !res.data) {
        console.log(res);
        throw new Error(res.error || "Failed to save report");
      }
      return res.data as { id: string };
    },
    onSuccess: (data) => {
      onSuccess?.(data.id);
    },
  });

  return {
    save: (report) => mutation.mutate(report),
    isPending: mutation.isPending,
    error: (mutation.error ?? undefined) as Error | undefined,
  };
}
