"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAssessmentDetails } from "@/lib/query/use-assessment-details-query";
import IssueStatisticsChart from "@/components/custom/issue-statistics-chart";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Issue } from "@/types/issue";

interface PageProps {
  params: { id: string };
}

export default function AssessmentDetailPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();
  const { assessment, stats, issues } = useAssessmentDetails(id);

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
      {
        header: "Description",
        accessorKey: "description",
        sortable: true,
        cell: (issue) => (
          <span className="line-clamp-2">{issue.description}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <Link
          href="/assessments"
          className="dark:text-white hover:underline flex items-center focus:outline-dashed focus:outline-primary focus:outline-4 focus:outline-offset-4 w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Assessments
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-primary shadow-md dark:bg-card dark:border-border overflow-hidden flex">
        <div className="p-6 w-2/3">
          <div className="flex flex-col justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {assessment?.name ?? ""}
              </h1>
            </div>

            {/* Issues Datatable */}
            <div className="mb-8">
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
              <p className={"gap-2 flex"}>
                {assessment?.tags?.map((tag) => (
                  <Badge className={"text-md"} key={tag.id}>
                    {tag.label}
                  </Badge>
                ))}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
