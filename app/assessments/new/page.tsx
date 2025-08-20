"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewAssessmentPage() {
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
          <h1 className="text-2xl font-bold mb-4">Create Assessment</h1>
          <p className="text-gray-700 dark:text-gray-300">
            This is a placeholder for the Assessment creation form.
          </p>
        </div>
      </div>
    </div>
  );
}
