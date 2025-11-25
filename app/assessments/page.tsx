"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assessmentsApi } from "@/lib/api";
import { Assessment } from "@/types/assessment";
import {
  LoadingIndicator,
  EmptyState,
  ErrorMessage,
} from "@/components/custom/assessments/common";
import AssessmentList from "@/components/custom/assessments/AssessmentList";
import ButtonToolbar from "@/app/vpats/[vpatId]/ButtonToolbar";

function Page() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await assessmentsApi.getAssessments({
        sortBy: "created_at",
        sortOrder: "desc",
      });

      if (response.success && response.data) {
        setAssessments(response.data.data || []);
      } else {
        throw new Error(response.error || "Failed to fetch assessments");
      }
    } catch (err) {
      console.error("Error fetching assessments:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  return (
    <div className="container px-4 py-8 min-h-full min-w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Assessments</h1>
        <ButtonToolbar
          buttons={
            <>
              <Button
                asChild
                variant={"success"}
                className={"ml-5 overflow-visible"}
              >
                <Link href={"/assessments/new"}>
                  <PlusIcon /> Create Assessment
                </Link>
              </Button>
            </>
          }
        />
      </div>

      <ErrorMessage message={error} />

      {loading ? (
        <LoadingIndicator />
      ) : assessments.length === 0 ? (
        <EmptyState />
      ) : (
        <AssessmentList assessments={assessments} />
      )}
    </div>
  );
}

export default Page;
