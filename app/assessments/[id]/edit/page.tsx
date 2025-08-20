"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditAssessmentPage({ params }: PageProps) {
  const { id } = React.use(params);
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <Link
          href={`/assessments/${id}`}
          onClick={(e) => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              e.preventDefault();
              router.back();
            }
          }}
          className="dark:text-white hover:underline flex items-center focus:outline-dashed focus:outline-primary focus:outline-4 focus:outline-offset-4 w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Assessment
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-primary shadow-md dark:bg-card dark:border-border overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Edit Assessment</h1>
          <p className="text-gray-700 dark:text-gray-300">
            This is a placeholder for the Assessment edit form for ID: <span className="font-mono">{id}</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
