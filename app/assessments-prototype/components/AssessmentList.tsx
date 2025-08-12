import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AssessmentWithCounts } from "../hooks/useAssessments";

// AssessmentList component props
interface AssessmentListProps {
  assessments: AssessmentWithCounts[];
  viewMode: "table" | "card";
}

/**
 * Renders a grid of assessment cards
 */
export function AssessmentList({ assessments, viewMode }: AssessmentListProps) {
  if (viewMode === "table") {
    // The table view is handled by DataTable in the parent component
    return null;
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      data-testid="assessments-grid"
    >
      {assessments.map((assessment) => (
        <Link
          key={assessment.documentId}
          href={`/assessments/${assessment.documentId}`}
          className="bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-border focus:outline-dashed focus:outline-4 focus:outline-offset-4 focus:outline-primary issue-card"
          data-testid={`assessment-card-${assessment.documentId}`}
        >
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div className={"mb-10"}>
                <h2 className="text-xl font-semibold mb-2">
                  {assessment.name}
                </h2>
                <p>{assessment.description}</p>
              </div>
              <div className="flex flex-col items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
                <span
                  className={"font-bold text-xl text-primary dark:text-white"}
                >
                  {assessment.issueCount || 0}
                </span>
                Issues
              </div>
            </div>
            {assessment.tags && assessment.tags.length > 0 && (
              <div className="mt-2 border-t border-border pt-4">
                <p className="text-sm font-medium mb-1">Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {assessment.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                    >
                      {tag.label || tag.slug || "No Label"}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {!assessment.tags ||
              (assessment.tags.length === 0 && (
                <div className="mt-2 border-t border-border pt-4">
                  <p className="text-sm font-medium mb-1">Tags:</p>
                  None
                </div>
              ))}
          </div>
        </Link>
      ))}
    </div>
  );
}

export default AssessmentList;
