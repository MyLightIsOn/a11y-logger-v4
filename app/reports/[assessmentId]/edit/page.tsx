"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EditReportPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <Link
          href={`/reports/${assessmentId}`}
          className="dark:text-white hover:underline flex items-center a11y-focus w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Report Detail
        </Link>
        <div>
          <Button variant="outline" onClick={() => router.push(`/reports/${assessmentId}`)}>
            Cancel
          </Button>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-4">Edit Report (Placeholder)</h1>
      <p className="text-muted-foreground">
        This is a placeholder for the report edit form for assessment <b>{assessmentId}</b>.
      </p>
    </div>
  );
}
