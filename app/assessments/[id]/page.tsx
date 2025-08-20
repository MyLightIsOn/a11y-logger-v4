"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAssessmentDetails } from "@/lib/query/use-assessment-details-query";
import IssueStatisticsChart from "@/components/custom/issue-statistics-chart";

interface PageProps {
  params: { id: string };
}

export default function AssessmentDetailPage({ params }: PageProps) {
  const { id } = params;
  const { assessment, stats } = useAssessmentDetails(id);

  const critical = stats?.critical ?? 0;
  const high = stats?.high ?? 0;
  const medium = stats?.medium ?? 0;
  const low = stats?.low ?? 0;
  const total = stats?.total ?? 0;

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
              <h1 className="text-2xl font-bold mb-2">{assessment?.name ?? ""}</h1>
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
        </div>
      </div>
    </div>
  );
}
