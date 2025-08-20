"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProjectForm, ProjectFormValues } from "@/components/custom/projects/ProjectForm";
import { useCreateProjectMutation } from "@/lib/query/use-create-project-mutation";
import type { CreateProjectRequest } from "@/lib/api/projects";

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useCreateProjectMutation();

  const handleSubmit = async (values: ProjectFormValues) => {
    const payload: CreateProjectRequest = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      tag_ids: values.tag_ids && values.tag_ids.length ? values.tag_ids : undefined,
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
          className="dark:text-white hover:underline flex items-center focus:outline-dashed focus:outline-primary focus:outline-4 focus:outline-offset-4 w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Projects
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-primary shadow-md dark:bg-card dark:border-border overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Create Project</h1>
          <ProjectForm
            mode="create"
            submitting={createProject.isPending}
            error={createProject.error}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
