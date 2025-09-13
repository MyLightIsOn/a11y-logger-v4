"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Edit, Trash } from "lucide-react";
import { useAssessmentDetails } from "@/lib/query/use-assessment-details-query";
import IssueStatisticsChart from "@/components/custom/issue-statistics-chart";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDate } from "@/lib/utils";
import type { Issue } from "@/types/issue";

import { useGenerateReport } from "@/lib/query/use-generate-report-mutation";
import { reportsApi } from "@/lib/api";
import AiIcon from "@/components/custom/AiIcon";

function GenerateReportButton({
  assessmentId,
  hasReport,
  issueCount,
}: {
  assessmentId: string;
  hasReport: boolean | null;
  issueCount: number;
}) {
  const router = useRouter();
  const [localError, setLocalError] = useState<string | undefined>(undefined);
  const { generate, isPending, error } = useGenerateReport(assessmentId, () => {
    router.push(`/reports/${assessmentId}`);
  });

  React.useEffect(() => {
    setLocalError(error?.message);
  }, [error?.message]);

  return (
    <div className="flex flex-col items-end">
      <Button
        className={"min-w-[160px]"}
        onClick={() => {
          setLocalError(undefined);
          generate({ mode: "master", includePatterns: false });
        }}
        disabled={isPending || issueCount === 0}
      >
        {isPending ? (
          <span className="flex items-center">
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Generating...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <AiIcon /> {hasReport ? "Regenerate Report" : "Generate Report"}
          </span>
        )}
      </Button>
      {localError && (
        <span
          className="text-sm text-red-600 mt-1"
          role="status"
          aria-live="polite"
        >
          {localError}
        </span>
      )}
    </div>
  );
}

export default function AssessmentDetailPage() {
  const [hasReport, setHasReport] = useState<boolean | null>(false);
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { assessment, stats, issues, deleteAssessment, isLoading, error } =
    useAssessmentDetails(id);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  React.useEffect(() => {
    let active = true;
    const check = async () => {
      if (!id) return;
      try {
        const res = await reportsApi.getLatest(id);
        if (!active) return;
        setHasReport(Boolean(res?.success && res?.data));
      } catch {
        if (!active) return;
        setHasReport(false);
      }
    };
    void check();
    return () => {
      active = false;
    };
  }, [id]);

  const critical = stats?.critical ?? 0;
  const high = stats?.high ?? 0;
  const medium = stats?.medium ?? 0;
  const low = stats?.low ?? 0;
  const total = stats?.total ?? 0;

  const columns: DataTableColumn<Issue>[] = useMemo(
    () => [
      {
        header: "Title",
        accessorKey: "title",
        sortable: true,
        cell: (issue) => (
          <Link
            href={`/issues/${issue.id}`}
            className="font-bold hover:underline"
          >
            {issue.title}
          </Link>
        ),
      },
      {
        header: "Criteria",
        accessorKey: "title",
        sortable: false,
        cell: (issue) => {
          const codes =
            (issue as Issue & { criteria_codes?: string[] }).criteria_codes ||
            [];
          return (
            <div className="flex flex-wrap gap-1">
              {codes.length > 0 ? (
                codes.slice(0, 2).map((code: string, index: number) => (
                  <Badge
                    key={code + "-" + index}
                    variant="outline"
                    className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full"
                  >
                    {code}
                  </Badge>
                ))
              ) : (
                <span className="text-gray-500 text-xs">No criteria</span>
              )}
              {codes.length > 2 && (
                <Badge
                  variant="outline"
                  className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full"
                >
                  +{codes.length - 2}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        header: "Severity",
        accessorKey: "severity",
        sortable: true,
        cell: (issue) => (
          <Badge
            variant="outline"
            className={`text-black p-1 px-2 ${
              issue.severity === "1"
                ? "bg-red-100 border-red-800"
                : issue.severity === "2"
                  ? "bg-orange-100 border-orange-800"
                  : issue.severity === "3"
                    ? "bg-yellow-100 border-yellow-800"
                    : "bg-blue-100 border-blue-800"
            }`}
          >
            {issue.severity === "1" ? (
              <p className={"flex items-center text-xs"}>
                CRITICAL
                <span
                  className={"block w-3 h-3 rounded-full bg-red-400 ml-2"}
                />
              </p>
            ) : issue.severity === "2" ? (
              <p className={"flex items-center text-xs"}>
                HIGH
                <span
                  className={"block w-3 h-3  rounded-full bg-orange-400 ml-2"}
                />
              </p>
            ) : issue.severity === "3" ? (
              <p className={"flex items-center text-xs"}>
                MEDIUM
                <span
                  className={"block w-3 h-3 rounded-full bg-yellow-400 ml-2"}
                />
              </p>
            ) : (
              <p className={"flex items-center text-xs"}>
                LOW
                <span
                  className={"block w-3 h-3 rounded-full bg-blue-400 ml-2"}
                />
              </p>
            )}
          </Badge>
        ),
      },
    ],
    [],
  );

  const showDeleteConfirmation = () => setIsDeleteModalOpen(true);
  const handleDelete = () => {
    // Trigger delete and navigate back to list (optimistic)
    deleteAssessment.mutate();
    router.push("/assessments");
  };

  // Loading state
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

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push("/assessments")}>
            Back to Assessments
          </Button>
        </div>
      </div>
    );
  }

  // Not Found state
  if (!assessment) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>
            The requested assessment could not be found.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push("/assessments")}>
            Back to Assessments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <Link
          href="/assessments"
          onClick={(e) => {
            // Prefer real browser back when history exists to maintain user context (filters, page, etc.)
            if (typeof window !== "undefined" && window.history.length > 1) {
              e.preventDefault();
              router.back();
            }
          }}
          className="dark:text-white hover:underline flex items-center focus:outline-dashed focus:outline-primary focus:outline-4 focus:outline-offset-4 w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Assessments
        </Link>
        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <GenerateReportButton
            issueCount={issues.length}
            assessmentId={id}
            hasReport={hasReport}
          />
          {hasReport ? (
            <Button
              className={"min-w-[140px]"}
              variant="outline"
              onClick={() => router.push(`/reports/${id}`)}
              aria-label="View latest report"
            >
              View Report
            </Button>
          ) : null}
          <Button
            className={"min-w-[100px]"}
            variant="outline"
            onClick={() => router.push(`/assessments/${id}/edit`)}
          >
            Edit <Edit />
          </Button>
          <Button
            className={"min-w-[100px]"}
            variant="destructive"
            onClick={showDeleteConfirmation}
            disabled={deleteAssessment.isPending}
          >
            {deleteAssessment.isPending ? "Deleting..." : "Delete"} <Trash />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-primary shadow-md dark:bg-card dark:border-border overflow-hidden flex">
        <div className="p-6 w-2/3">
          <div className="flex flex-col justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {assessment?.name ?? ""}
              </h1>
              {assessment?.description && (
                <div className="mb-4">
                  <p className="text-gray-700 dark:text-gray-300">
                    {assessment.description}
                  </p>
                </div>
              )}
            </div>

            {/* Issues Datatable */}
            <div className="mb-8 w-full">
              <h2 className="text-lg font-semibold mb-4">Issues</h2>
              <DataTable<Issue>
                data={issues}
                columns={columns}
                onRowClick={(issue) => {
                  router.push(`/issues/${issue.id}`);
                }}
              />
            </div>
          </div>
        </div>
        <div className="p-6 w-1/3 dark:bg-border-border border-l border-border">
          <IssueStatisticsChart
            criticalCount={critical}
            highCount={high}
            mediumCount={medium}
            lowCount={low}
            totalCount={total}
          />
          <div className={"flex flex-col mt-4"}>
            <div className={"flex justify-between mb-2 gap-10"}>
              <p className={"font-bold text-right w-1/2"}>Created:</p>
              <p className={"w-1/2"}>
                {assessment?.created_at && formatDate(assessment.created_at)}
              </p>
            </div>
            <div className={"flex justify-between mb-2 gap-10"}>
              <p className={"font-bold text-right w-1/2"}>Updated:</p>
              <p className={"w-1/2"}>
                {assessment?.updated_at && formatDate(assessment.updated_at)}
              </p>
            </div>
            <div
              className={
                "flex justify-between mb-2 gap-10 border-b border-border pb-8"
              }
            >
              <p className={"font-bold text-right w-1/2"}>Guidelines:</p>
              <p className={"w-1/2"}>
                {assessment?.wcag_version
                  ? String(assessment.wcag_version).toUpperCase()
                  : "Not specified"}
              </p>
            </div>
            <div className={"flex mb-2 pt-4 mx-auto"}>
              <p className={"font-bold mr-4"}>Tags:</p>
              <p className={"gap-2 flex flex-wrap"}>
                {assessment?.tags?.map((tag, index) => (
                  <Badge
                    key={tag.id + "-" + index}
                    variant="outline"
                    className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                  >
                    {tag.label}
                  </Badge>
                ))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Confirm Deletion"
        message="Are you sure you want to delete this assessment? This action cannot be undone."
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
      />
    </div>
  );
}
