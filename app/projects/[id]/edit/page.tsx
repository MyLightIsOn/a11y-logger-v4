"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  ProjectForm,
  ProjectFormValues,
} from "@/components/custom/projects/ProjectForm";
import AssessmentSelection from "@/components/custom/projects/AssessmentSelection";
import { useProjectDetails } from "@/lib/query/use-project-details-query";
import { useUpdateProjectMutation } from "@/lib/query/use-update-project-mutation";
import type { UpdateProjectRequest } from "@/lib/api/projects";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditProjectPage({ params }: PageProps) {
  const { id } = React.use(params);
  const router = useRouter();

  const { data: project, isLoading, error } = useProjectDetails({ id });
  const updateProject = useUpdateProjectMutation();

  const handleSubmit = async (values: ProjectFormValues) => {
    const payload: UpdateProjectRequest = {
      name: values.name?.trim() || undefined,
      description: values.description?.trim() || undefined,
      tag_ids:
        values.tag_ids && values.tag_ids.length ? values.tag_ids : undefined,
      assessment_ids:
        values.assessment_ids && values.assessment_ids.length
          ? values.assessment_ids
          : undefined,
    };

    return new Promise<void>((resolve) => {
      updateProject.mutate(
        { id, payload },
        {
          onSuccess: () => {
            router.push(`/projects/${id}`);
            resolve();
          },
          onError: () => {
            // Error is shown via updateProject.error below
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
          href={`/projects/${id}`}
          onClick={(e) => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              e.preventDefault();
              router.back();
            }
          }}
          className="dark:text-white hover:underline flex items-center a11y-focus w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Project
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-primary shadow-md dark:bg-card dark:border-border overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Edit Project</h1>
          {isLoading ? (
            <div>Loading project…</div>
          ) : error ? (
            <div className="text-destructive">
              Failed to load project: {error.message}
            </div>
          ) : !project ? (
            <div className="text-destructive">Project not found.</div>
          ) : (
            <ProjectForm
              mode="edit"
              initialData={project}
              submitting={updateProject.isPending}
              error={updateProject.error}
              onSubmit={handleSubmit}
              renderAssessmentSelection={({ selectedIds, onChange }) => (
                <AssessmentSelection
                  selected={selectedIds}
                  onSelectedChangeAction={onChange}
                />
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
