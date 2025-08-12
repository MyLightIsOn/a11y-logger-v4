import React from 'react';

/**
 * Loading indicator component
 */
export function LoadingIndicator() {
  return (
    <div className="text-center py-8" data-testid="loading-indicator">
      <p className="text-gray-500">Loading assessments...</p>
    </div>
  );
}

/**
 * Empty state component when no assessments are found
 */
export function EmptyState() {
  return (
    <div className="text-center py-8 bg-card rounded-lg" data-testid="empty-state">
      <p className="text-gray-500">
        No assessments found. Create your first assessment!
      </p>
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
