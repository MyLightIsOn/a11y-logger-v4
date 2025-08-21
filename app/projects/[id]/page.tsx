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
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import type { Assessment } from "@/types/assessment";
import IssueStatisticsChart from "@/components/custom/issue-statistics-chart";
import { useQueries } from "@tanstack/react-query";
import { assessmentsApi } from "@/lib/api";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: PageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { data: project, isLoading, error } = useProjectDetails({ id });
  const deleteProject = useDeleteProjectMutation();

  // Prepare aggregated issue stats across all linked assessments.
  const assessmentsForStats = project?.assessments ?? [];
  const assessmentIds = React.useMemo(
    () => assessmentsForStats.map((a) => a.id),
    [assessmentsForStats],
  );

  const statsQueries = useQueries({
    queries: assessmentIds.map((aid) => ({
      queryKey: ["assessments", { id: aid }, "issues"] as const,
      queryFn: async () => {
        const res = await assessmentsApi.getAssessmentIssues(aid);
        if (!res.success || !res.data) {
          throw new Error(res.error || "Failed to load assessment issues");
        }
        return res.data.stats;
      },
      enabled: Boolean(aid) && !isLoading,
      staleTime: 1000 * 60 * 5,
    })),
  });

  const aggregatedStats = React.useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const q of statsQueries) {
      const s = q.data as
        | { critical: number; high: number; medium: number; low: number }
        | undefined;
      if (s) {
        counts.critical += s.critical;
        counts.high += s.high;
        counts.medium += s.medium;
        counts.low += s.low;
      }
    }
    const total = counts.critical + counts.high + counts.medium + counts.low;
    return { ...counts, total };
  }, [statsQueries]);

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

  const columns: DataTableColumn<Assessment>[] = [
    {
      header: "Name",
      accessorKey: "name",
      sortable: true,
      cell: (a) => (
        <Link href={`/assessments/${a.id}`} className="font-bold hover:underline">
          {a.name}
        </Link>
      ),
    },
    {
      header: "Description",
      accessorKey: "description",
      sortable: true,
      cell: (a) => <span className="line-clamp-2">{a.description}</span>,
    },
    {
      header: "Created",
      accessorKey: "created_at",
      sortable: true,
      cell: (a) => <span>{a.created_at ? formatDate(a.created_at) : ""}</span>,
    },
    {
      header: "Updated",
      accessorKey: "updated_at",
      sortable: true,
      cell: (a) => <span>{a.updated_at ? formatDate(a.updated_at) : ""}</span>,
    },
  ];

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
              <h2 className="text-lg font-semibold mb-4">Linked Assessments</h2>
              {assessments.length === 0 ? (
                <p className="text-sm text-gray-600">No assessments linked.</p>
              ) : (
                <DataTable<Assessment>
                  data={assessments}
                  columns={columns}
                  onRowClick={(a) => router.push(`/assessments/${a.id}`)}
                  data-testid="project-assessments-table"
                />
              )}
            </div>
          </div>
        </div>

        <div className="p-6 w-1/3 dark:bg-border-border border-l border-border">
          <IssueStatisticsChart
            criticalCount={aggregatedStats.critical}
            highCount={aggregatedStats.high}
            mediumCount={aggregatedStats.medium}
            lowCount={aggregatedStats.low}
            totalCount={aggregatedStats.total}
          />
          <div className={"flex flex-col mt-4"}>
            <div className={"flex justify-between mb-2 gap-10"}>
              <p className={"font-bold text-right w-1/2"}>Created:</p>
              <p className={"w-1/2"}>{project.created_at && formatDate(project.created_at)}</p>
            </div>
            <div className={"flex justify-between mb-2 gap-10 border-b border-border pb-8"}>
              <p className={"font-bold text-right w-1/2"}>Updated:</p>
              <p className={"w-1/2"}>{project.updated_at && formatDate(project.updated_at)}</p>
            </div>
            <div className={"flex mb-2 pt-4 mx-auto"}>
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
