import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Assessment } from "@/types/assessment";

// AssessmentList component props
interface AssessmentListProps {
  assessments: Assessment[];
}

/**
 * Renders a grid of assessment cards (parity with Projects list)
 */
export function AssessmentList({ assessments }: AssessmentListProps) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      data-testid="assessments-grid"
    >
      {assessments.map((assessment) => (
        <div
          key={assessment.id}
          className="bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-border"
          data-testid={`assessment-card-${assessment.id}`}
        >
          <Link href={`/assessments/${assessment.id}`} className="block">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-semibold mb-2">{assessment.name}</h2>
              </div>

              {assessment.description && (
                <p className="text-foreground mb-4 text-sm leading-relaxed">
                  {assessment.description}
                </p>
              )}

              {assessment.tags && assessment.tags.length > 0 && (
                <div className="mt-2 border-t border-border pt-4">
                  <p className="text-sm font-medium mb-1">Tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {assessment.tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                      >
                        {tag.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {!assessment.tags || (assessment.tags.length === 0 && (
                <div className="mt-2 border-t border-border pt-4">
                  <p className="text-sm font-medium mb-1">Tags:</p>
                  None
                </div>
              ))}
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}

export default AssessmentList;
