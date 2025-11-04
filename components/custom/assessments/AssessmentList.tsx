import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Assessment } from "@/types/assessment";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// AssessmentList component props
interface AssessmentListProps {
  assessments: Assessment[];
}

function DescriptionFirstLine({ text }: { text?: string | null }) {
  if (!text) return <span className="text-muted-foreground">—</span>;
  const firstLine = text.split("\n")[0]?.trim();
  return <span className="text-muted-foreground">{firstLine || "—"}</span>;
}

/**
 * Renders a grid of assessment cards using the shared Card component (parity with VPAT/Projects lists)
 */
export function AssessmentList({ assessments }: AssessmentListProps) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      data-testid="assessments-grid"
    >
      {assessments.map((assessment) => (
        <Link key={assessment.id} href={`/assessments/${assessment.id}`}>
          <Card
            className="h-full shadow-md"
            data-testid={`assessment-card-${assessment.id}`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{assessment.name}</CardTitle>
              <CardDescription>
                <DescriptionFirstLine text={assessment.description ?? null} />
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              {assessment.tags && assessment.tags.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <div className="text-sm font-medium mb-1">Tags</div>
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
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tags</span>
                  <span className="text-muted-foreground">—</span>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default AssessmentList;
