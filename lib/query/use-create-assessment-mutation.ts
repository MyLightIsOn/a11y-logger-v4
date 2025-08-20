import { useMutation } from "@tanstack/react-query";
import { assessmentsApi } from "@/lib/api";
import type { Assessment } from "@/types/assessment";
import type { CreateAssessmentRequest } from "@/lib/api/assessments";

/**
 * Mutation hook to create an Assessment using the Assessments API service.
 * - On success, returns the created Assessment entity.
 * - On error, throws an Error with a user-friendly message.
 */
export function useCreateAssessmentMutation() {
  return useMutation<Assessment, Error, CreateAssessmentRequest>({
    mutationKey: ["assessments", "create"],
    mutationFn: async (payload: CreateAssessmentRequest) => {
      const res = await assessmentsApi.createAssessment(payload);
      if (!res.success) {
        throw new Error(res.error || "Failed to create assessment");
      }
      return res.data as Assessment;
    },
  });
}
