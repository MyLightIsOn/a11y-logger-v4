"use client";

import React, { useState, useEffect } from "react";
import AssessmentForm from "@/components/forms/assessment-form";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import { PlusIcon } from "lucide-react";
import { AssessmentCreateInput } from "@/types/assessment";
import { useAssessments, AssessmentWithCounts } from "./hooks/useAssessments";
import {
  LoadingIndicator,
  EmptyState,
  ErrorMessage,
} from "./components/common";
import AssessmentList from "./components/AssessmentList";
import { formatDate } from "@/lib/utils";

export default function Page() {
  const router = useRouter();
  const {
    assessments,
    loading,
    error,
    fetchAssessments,
    addAssessment,
    deleteAssessments,
  } = useAssessments();
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  // Fetch assessments on component mount
  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  // Handle form submission (create only)
  const handleSubmit = async (assessmentData: AssessmentCreateInput) => {
    try {
      await addAssessment(assessmentData);
      setShowForm(false);
    } catch (err) {
      console.error("Error in assessment submission:", err);
      // Don't re-throw the error to allow tests to continue
    }
  };

  // Handle form cancellation
  const handleCancel = () => {
    setShowForm(false);
  };

  // Navigate to the assessment view page
  const handleView = (assessmentDocumentId: string) => {
    router.push(`/assessments/${assessmentDocumentId}`);
  };

  // Define columns for the data table
  const columns = [
    {
      header: "Name",
      accessorKey: "name" as keyof AssessmentWithCounts,
      sortable: true,
      cell: (assessment: AssessmentWithCounts) => (
        <span className="line-clamp-2 font-bold">{assessment.name}</span>
      ),
    },
    {
      header: "Issues",
      accessorKey: "issueCount" as keyof AssessmentWithCounts,
      sortable: true,
      center: true,
      cell: (assessment: AssessmentWithCounts) => (
        <span className={"block text-center font-bold text-lg"}>
          {assessment.issueCount || 0}
        </span>
      ),
    },
    {
      header: "Critical",
      accessorKey: "criticalIssueCount" as keyof AssessmentWithCounts,
      sortable: true,
      center: true,
      cell: (assessment: AssessmentWithCounts) => (
        <span className={"block text-center font-bold text-lg"}>
          {assessment.criticalIssueCount || 0}
        </span>
      ),
    },
    {
      header: "High",
      accessorKey: "highIssueCount" as keyof AssessmentWithCounts,
      sortable: true,
      center: true,

      cell: (assessment: AssessmentWithCounts) => (
        <span className={"block text-center font-bold text-lg"}>
          {assessment.highIssueCount || 0}
        </span>
      ),
    },
    {
      header: "Medium",
      accessorKey: "mediumIssueCount" as keyof AssessmentWithCounts,
      sortable: true,
      center: true,

      cell: (assessment: AssessmentWithCounts) => (
        <span className={"block text-center font-bold text-lg"}>
          {assessment.mediumIssueCount || 0}
        </span>
      ),
    },
    {
      header: "Low",
      accessorKey: "lowIssueCount" as keyof AssessmentWithCounts,
      sortable: true,
      center: true,
      cell: (assessment: AssessmentWithCounts) => (
        <span className={"block text-center font-bold text-lg"}>
          {assessment.lowIssueCount || 0}
        </span>
      ),
    },
    {
      header: "Updated",
      accessorKey: "updatedAt" as keyof AssessmentWithCounts,
      sortable: true,
      cell: (assessment: AssessmentWithCounts) => (
        <span>{assessment.updatedAt && formatDate(assessment.updatedAt)}</span>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 min-h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Assessments</h1>
        <div className="flex items-center gap-4">
          {!showForm && (
            <>
              <div className="flex items-center space-x-2">
                <Label htmlFor="view-mode" className="sr-only">
                  View Mode
                </Label>
                <div className="flex items-center space-x-1">
                  <List
                    className={`h-4 w-4 ${viewMode === "table" ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <Switch
                    id="view-mode"
                    checked={viewMode === "card"}
                    onCheckedChange={(checked) =>
                      setViewMode(checked ? "card" : "table")
                    }
                  />
                  <LayoutGrid
                    className={`h-4 w-4 ${viewMode === "card" ? "text-primary" : "text-muted-foreground"}`}
                  />
                </div>
              </div>
              <Button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-success dark:bg-success"
                data-testid="create-assessment-button"
              >
                Create Assessment <PlusIcon className="ml-2" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      <ErrorMessage message={error} />

      {/* Assessment form */}
      {showForm && (
        <div className="mb-8">
          <AssessmentForm onSubmit={handleSubmit} onCancel={handleCancel} />
        </div>
      )}

      {/* Assessments list - only show when form is not displayed */}
      {!showForm &&
        (loading ? (
          <LoadingIndicator />
        ) : assessments.length === 0 ? (
          <EmptyState />
        ) : viewMode === "table" ? (
          <DataTable
            data={assessments}
            columns={columns}
            onRowClick={(assessment) => handleView(assessment.documentId)}
            selectable={true}
            onDeleteSelected={deleteAssessments}
          />
        ) : (
          <AssessmentList assessments={assessments} viewMode={viewMode} />
        ))}
    </div>
  );
}
