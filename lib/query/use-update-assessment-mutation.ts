import { useMutation } from "@tanstack/react-query";
import { assessmentsApi } from "@/lib/api";
import type { Assessment } from "@/types/assessment";
import type { UpdateAssessmentRequest } from "@/lib/api/assessments";

export interface UpdateAssessmentVariables {
  id: string;
  payload: UpdateAssessmentRequest;
}

/**
 * Mutation hook to update an Assessment using the Assessments API service.
 * - Accepts an object with the target assessment `id` and the patch `payload`.
 * - On success, returns the updated Assessment entity.
 * - On error, throws an Error with a user-friendly message.
 */
export function useUpdateAssessmentMutation() {
  return useMutation<Assessment, Error, UpdateAssessmentVariables>({
    mutationKey: ["assessments", "update"],
    mutationFn: async ({ id, payload }: UpdateAssessmentVariables) => {
      const res = await assessmentsApi.updateAssessment(id, payload);
      if (!res.success) {
        throw new Error(res.error || "Failed to update assessment");
      }
      return res.data as Assessment;
    },
  });
}
