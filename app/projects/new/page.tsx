"use client";

import Link from "next/link";
import { ArrowLeft, SaveIcon, Loader2, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ProjectForm,
  ProjectFormValues,
} from "@/components/custom/projects/ProjectForm";
import AssessmentSelection from "@/components/custom/projects/AssessmentSelection";
import { useCreateProjectMutation } from "@/lib/query/use-create-project-mutation";
import type { CreateProjectRequest } from "@/lib/api/projects";
import ButtonToolbar from "@/app/vpats/[vpatId]/ButtonToolbar";
import { Button } from "@/components/ui/button";
import React from "react";

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useCreateProjectMutation();

  const handleSubmit = async (values: ProjectFormValues) => {
    const payload: CreateProjectRequest = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      tag_ids:
        values.tag_ids && values.tag_ids.length ? values.tag_ids : undefined,
      assessment_ids:
        values.assessment_ids && values.assessment_ids.length
          ? values.assessment_ids
          : undefined,
    };

    return new Promise<void>((resolve) => {
      createProject.mutate(payload, {
        onSuccess: () => {
          router.push("/projects");
          resolve();
        },
        onError: () => {
          // Error is passed down via createProject.error
          resolve();
        },
      });
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <Link
          href="/projects"
          className="dark:text-white hover:underline flex items-center a11y-focus w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Projects
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">Create Project</h1>
      <ProjectForm
        mode="create"
        submitting={createProject.isPending}
        error={createProject.error}
        onSubmit={handleSubmit}
        renderAssessmentSelection={({ selectedIds, onChange }) => (
          <AssessmentSelection
            selected={selectedIds}
            onSelectedChangeAction={onChange}
          />
        )}
      />

      <ButtonToolbar
        buttons={
          <>
            <Button
              className="bg-success dark:bg-successfles"
              type="submit"
              disabled={createProject.isPending}
              aria-describedby="submit-status"
            >
              {createProject.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <SaveIcon className="h-4 w-4" aria-hidden="true" />
              )}
              {createProject.isPending ? "Saving Project..." : "Save Project"}
            </Button>
            <span
              id="submit-status"
              role="status"
              aria-live="polite"
              className="sr-only"
            >
              {createProject.isPending ? "Saving Project" : ""}
            </span>
            <Button
              className="bg-destructive dark:bg-destructive"
              onClick={() => router.push("/projects")}
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
