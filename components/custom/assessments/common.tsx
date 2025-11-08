import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Loading indicator component for assessments
 */
export function LoadingIndicator() {
  return (
    <div className="w-full h-72 flex items-center justify-center">
      <div className="loader"></div>
    </div>
  );
}

/**
 * Empty state component when no assessments are found
 */
export function EmptyState() {
  return (
    <div
      className="text-center py-8 bg-card rounded-lg"
      data-testid="empty-state"
    >
      <p className="text-gray-500 mb-4">
        No assessments found. Create your first assessment to get started.
      </p>
      <Link
        href="/assessments/new"
        className="inline-flex items-center justify-center"
      >
        <Button>Create Assessment</Button>
      </Link>
    </div>
  );
}

/**
 * Error message component for displaying error notifications
 */
interface ErrorMessageProps {
  message: string | null;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div
      className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
      data-testid="error-message"
    >
      {message}
    </div>
  );
}
