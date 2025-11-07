"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  AssessmentForm,
  AssessmentFormValues,
} from "@/components/custom/assessments/AssessmentForm";
import { useAssessmentDetails } from "@/lib/query/use-assessment-details-query";
import { useUpdateAssessmentMutation } from "@/lib/query/use-update-assessment-mutation";
import type { UpdateAssessmentRequest } from "@/lib/api/assessments";
import type { WcagVersion } from "@/types/issue";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditAssessmentPage({ params }: PageProps) {
  const { id } = React.use(params);
  const router = useRouter();

  const { assessment, issues, isLoading, error } = useAssessmentDetails(id);
  const updateAssessment = useUpdateAssessmentMutation();

  const handleSubmit = async (values: AssessmentFormValues) => {
    const payload: UpdateAssessmentRequest = {
      name: values.name?.trim() || undefined,
      description: values.description?.trim() || undefined,
      wcag_version: (values.wcag_version as WcagVersion) || undefined,
      tag_ids:
        values.tag_ids && values.tag_ids.length ? values.tag_ids : undefined,
    };

    return new Promise<void>((resolve) => {
      updateAssessment.mutate(
        { id, payload },
        {
          onSuccess: () => {
            router.push(`/assessments/${id}`);
            resolve();
          },
          onError: () => {
            // Error displayed via updateAssessment.error
            resolve();
          },
        },
      );
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <Link
          href={`/assessments/${id}`}
          onClick={(e) => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              e.preventDefault();
              router.back();
            }
          }}
          className="dark:text-white hover:underline flex items-center a11y-focus w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Assessment
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-primary shadow-md dark:bg-card dark:border-border overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Edit Assessment</h1>
          {isLoading ? (
            <div>Loading assessment…</div>
          ) : error ? (
            <div className="text-destructive">
              Failed to load assessment: {error.message}
            </div>
          ) : !assessment ? (
            <div className="text-destructive">Assessment not found.</div>
          ) : (
            <AssessmentForm
              mode="edit"
              initialData={assessment}
              issueCount={issues?.length ?? 0}
              submitting={updateAssessment.isPending}
              error={updateAssessment.error}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
