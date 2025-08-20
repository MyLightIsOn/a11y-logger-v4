"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { useProjectDetails } from "@/lib/query/use-project-details-query";
import { useDeleteProjectMutation } from "@/lib/query/use-delete-project-mutation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: PageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { data: project, isLoading, error } = useProjectDetails({ id });
  const deleteProject = useDeleteProjectMutation();

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-2" />
        <Skeleton className="h-24 w-full mb-4" />
        <div className="flex gap-2 mt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push("/projects")}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>
            The requested project could not be found.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push("/projects")}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const assessments = project.assessments ?? [];
  const tags = project.tags ?? [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <Link
          href="/projects"
          onClick={(e) => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              e.preventDefault();
              router.back();
            }
          }}
          className="dark:text-white hover:underline flex items-center focus:outline-dashed focus:outline-primary focus:outline-4 focus:outline-offset-4 w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Projects
        </Link>

        <div className="flex justify-end gap-2">
          <Button
            className={"min-w-[100px]"}
            variant="outline"
            onClick={() => router.push(`/projects/${id}/edit`)}
          >
            Edit <Edit />
          </Button>
          <Button
            className={"min-w-[120px]"}
            variant="destructive"
            disabled={deleteProject.isPending}
            onClick={() => {
              const confirmed = window.confirm("Are you sure you want to delete this project? This action cannot be undone.");
              if (!confirmed) return;
              deleteProject.mutate(id, {
                onSuccess: () => {
                  router.push("/projects");
                },
              });
            }}
            data-testid="delete-project-button"
          >
            {deleteProject.isPending ? "Deleting..." : "Delete"} <Trash2 className="ml-2" />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-primary shadow-md dark:bg-card dark:border-border overflow-hidden flex">
        <div className="p-6 w-2/3">
          <div className="flex flex-col justify-between items-start mb-4 w-full">
            <div className="w-full">
              <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
              {project.description && (
                <div className="mb-4">
                  <p className="text-gray-700 dark:text-gray-300">
                    {project.description}
                  </p>
                </div>
              )}
            </div>

            {/* Assessments section */}
            <div className="mb-8 w-full">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">Linked Assessments</h2>
                {/* Management hint/button */}
                <Button
                  variant="ghost"
                  className="text-sm"
                  onClick={() => router.push(`/projects/${id}/edit`)}
                >
                  Manage Assessments
                </Button>
              </div>
              {assessments.length === 0 ? (
                <p className="text-sm text-gray-600">
                  No assessments linked. Use &quot;Manage Assessments&quot; to add.
                </p>
              ) : (
                <ul className="list-disc pl-5 space-y-2">
                  {assessments.map((a) => (
                    <li key={a.id}>
                      <Link href={`/assessments/${a.id}`} className="font-medium hover:underline">
                        {a.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 w-1/3 dark:bg-border-border border-l border-border">
          <div className={"flex flex-col mt-4"}>
            <div className={"flex mb-2"}>
              <p className={"font-bold mr-4"}>Tags:</p>
              <div className={"gap-2 flex flex-wrap"}>
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                  >
                    {tag.label}
                  </Badge>
                ))}
                {tags.length === 0 && <span className="text-sm text-gray-600">None</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
