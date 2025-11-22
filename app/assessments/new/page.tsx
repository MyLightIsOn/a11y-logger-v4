"use client";

import Link from "next/link";
import { ArrowLeft, SaveIcon, Loader2, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AssessmentForm,
  AssessmentFormValues,
} from "@/components/custom/assessments/AssessmentForm";
import { useCreateAssessmentMutation } from "@/lib/query/use-create-assessment-mutation";
import type { CreateAssessmentRequest } from "@/lib/api/assessments";
import type { WcagVersion } from "@/types/issue";
import ButtonToolbar from "@/app/vpats/[vpatId]/ButtonToolbar";
import { Button } from "@/components/ui/button";
import React from "react";

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
          className="dark:text-white hover:underline flex items-center a11y-focus w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to all Assessments
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">Create Assessment</h1>
      <AssessmentForm
        mode="create"
        submitting={createAssessment.isPending}
        error={createAssessment.error}
        onSubmit={handleSubmit}
      />

      <ButtonToolbar
        buttons={
          <>
            <Button
              className="bg-success dark:bg-successfles"
              type="submit"
              form="create-assessment-form"
              disabled={createAssessment.isPending}
              aria-describedby="submit-status"
            >
              {createAssessment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <SaveIcon className="h-4 w-4" aria-hidden="true" />
              )}
              {createAssessment.isPending
                ? "Saving Assessment..."
                : "Save Changes"}
            </Button>
            <span
              id="submit-status"
              role="status"
              aria-live="polite"
              className="sr-only"
            >
              {createAssessment.isPending ? "Saving Assessment" : ""}
            </span>
            <Button
              className="bg-destructive dark:bg-destructive"
              onClick={() => router.push("/assessments")}
              aria-label="Cancel"
            >
              <XIcon /> Cancel
            </Button>
          </>
        }
      />
    </div>
  );
}
