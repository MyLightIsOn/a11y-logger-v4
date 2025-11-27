import React from "react";
import { CircleSlash } from "lucide-react";

/**
 * Loading indicator component
 */
export function LoadingIndicator() {
  return (
    <div className="w-full h-72 flex items-center justify-center">
      <div className="loader"></div>
    </div>
  );
}

/**
 * Empty state component when no projects are found
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
      <p className="mb-4">No projects found</p>
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
