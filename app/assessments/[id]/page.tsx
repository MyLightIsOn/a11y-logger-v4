"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAssessmentDetails } from "@/lib/query/use-assessment-details-query";

interface PageProps {
  params: { id: string };
}

export default function AssessmentDetailPage({ params }: PageProps) {
  const { id } = params;
  const { assessment } = useAssessmentDetails(id);

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

      <div className="bg-white rounded-lg border border-primary shadow-md dark:bg-card dark:border-border overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">{assessment?.name ?? ""}</h1>
        </div>
      </div>
    </div>
  );
}
