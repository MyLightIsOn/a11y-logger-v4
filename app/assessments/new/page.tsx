"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AssessmentForm,
  AssessmentFormValues,
} from "@/components/custom/assessments/AssessmentForm";
import { useCreateAssessmentMutation } from "@/lib/query/use-create-assessment-mutation";
import type { CreateAssessmentRequest } from "@/lib/api/assessments";
import type { WcagVersion } from "@/types/issue";

export default function NewAssessmentPage() {
  const router = useRouter();
  const createAssessment = useCreateAssessmentMutation();

  const handleSubmit = async (values: AssessmentFormValues) => {
    const payload: CreateAssessmentRequest = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      wcag_version: values.wcag_version as WcagVersion,
      tag_ids:
        values.tag_ids && values.tag_ids.length ? values.tag_ids : undefined,
    };

    return new Promise<void>((resolve) => {
      createAssessment.mutate(payload, {
        onSuccess: () => {
          router.push("/assessments");
          resolve();
        },
        onError: () => {
          // Error is passed down via createAssessment.error
          resolve();
        },
      });
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <Link
          href="/assessments"
          className="dark:text-white hover:underline flex items-center w-fit a11y-focus"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Assessments
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-primary shadow-md dark:bg-card dark:border-border overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Create Assessment</h1>
          <AssessmentForm
            mode="create"
            submitting={createAssessment.isPending}
            error={createAssessment.error}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
