import { useState, useCallback } from "react";
import {
  getAllAssessments,
  createAssessment,
  deleteAssessment,
} from "@/data/services/assessments-service";
import { Assessment, AssessmentCreateInput } from "@/types/assessment";
import { ErrorResponse } from "@/types/common";

/**
 * Extended Assessment type with issue counts
 */
export interface AssessmentWithCounts extends Assessment {
  documentId: string;
  issueCount?: number;
  criticalIssueCount?: number;
  highIssueCount?: number;
  mediumIssueCount?: number;
  lowIssueCount?: number;
}

/**
 * Custom hook for managing assessments data and state
 */
export function useAssessments() {
  const [assessments, setAssessments] = useState<AssessmentWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all assessments with issue counts
   */
  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    setError(null);

    const fetchedAssessments = await getAllAssessments();

    // Check if the response is an error
    if (
      "success" in fetchedAssessments &&
      fetchedAssessments.success === false
    ) {
      console.error("Error fetching assessments:", fetchedAssessments.error);
      setError("Failed to load assessments. Please try again.");
      setLoading(false);
      return;
    }

    // Type assertion to ensure fetchedAssessments is an array of Assessment
    const assessmentsArray = fetchedAssessments as Assessment[];

    // Process assessments to calculate issue counts
    const assessmentsWithCounts = assessmentsArray.map((assessment) => {
      // Use the issues property directly from the assessment object
      const issues = assessment.issues || [];

      // Calculate the total issue count
      const issueCount = issues.length;

      // Calculate counts by severity
      const criticalIssueCount = issues.filter(
        (issue) => issue.severity === "critical",
      ).length;
      const highIssueCount = issues.filter(
        (issue) => issue.severity === "high",
      ).length;
      const mediumIssueCount = issues.filter(
        (issue) => issue.severity === "medium",
      ).length;
      const lowIssueCount = issues.filter(
        (issue) => issue.severity === "low",
      ).length;

      return {
        ...assessment,
        issueCount,
        criticalIssueCount,
        highIssueCount,
        mediumIssueCount,
        lowIssueCount,
      };
    });

    setAssessments(assessmentsWithCounts);
    setLoading(false);
  }, []);

  /**
   * Create a new assessment
   */
  const addAssessment = useCallback(
    async (assessmentData: AssessmentCreateInput) => {
      setError(null);

      // First create the assessment
      const response = await createAssessment(assessmentData);

      // Check if the response is an error
      if ("success" in response && response.success === false) {
        console.error("Error creating assessment:", response.error);
        setError("Failed to create assessment. Please try again.");
        return false;
      }

      // Then refresh the assessment list
      await fetchAssessments();
      return true;
    },
    [fetchAssessments],
  );

  /**
   * Delete multiple assessments
   */
  const deleteAssessments = useCallback(
    async (assessmentsToDelete: AssessmentWithCounts[]) => {
      setLoading(true);
      setError(null);

      // Delete each assessment
      const results = await Promise.all(
        assessmentsToDelete.map((assessment) => {
          if (!assessment.documentId) {
            console.error("Assessment missing documentId:", assessment);
            return {
              success: false,
              error: "Assessment missing documentId",
            } as ErrorResponse;
          }
          return deleteAssessment(assessment.documentId);
        }),
      );

      // Check if any of the responses are errors
      const errors = results.filter(
        (result): result is ErrorResponse =>
          "success" in result && result.success === false,
      );

      if (errors.length > 0) {
        console.error("Error deleting assessments:", errors);
        setError("Failed to delete some assessments. Please try again.");
        setLoading(false);
        return;
      }

      // Refresh the assessments list
      await fetchAssessments();
      setLoading(false);
    },
    [fetchAssessments],
  );

  return {
    assessments,
    loading,
    error,
    fetchAssessments,
    addAssessment,
    deleteAssessments,
  };
}
