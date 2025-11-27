import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CircleSlash } from "lucide-react";

/**
 * Loading indicator component for issues
 */
export function LoadingIndicator() {
  return (
    <div className="text-center py-8" data-testid="loading-indicator">
      <p className="text-gray-500">Loading issues...</p>
    </div>
  );
}

/**
 * Empty state component when no issues are found
 */
export function EmptyState() {
  return (
    <div
      className="text-center pt-[10%] flex flex-col justify-center items-center rounded-lg"
      data-testid="empty-state"
    >
      <CircleSlash
        className="text-gray-500 w-16 h-16 mb-4"
        data-testid="icon"
      />
      <p className="mb-4">No issues found</p>
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
