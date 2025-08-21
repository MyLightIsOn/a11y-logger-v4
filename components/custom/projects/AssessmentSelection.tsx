"use client";

import React from "react";
import { MultiSelect } from "@/components/ui/multi-select";
import ErrorAlert from "@/components/ui/error-alert";
import { normalizeErrorMessage } from "@/lib/errors";
import { useAssessmentsForProjectQuery } from "@/lib/query/use-assessments-for-project-query";
import type { Option } from "@/types/options";

export interface AssessmentSelectionProps {
  selected: string[];
  onSelectedChangeAction: (ids: string[]) => void;
  disabled?: boolean;
  /**
   * Optional errors object to support RHF or other form libs. If provided,
   * the component will render an error message and wire aria-invalid.
   */
  errors?: { assessment_ids?: { message?: unknown } } | null;
  /** Optional id attribute override for the control */
  id?: string;
}

/**
 * AssessmentSelection
 * - Multi-select for linking assessments to a Project
 * - Fetches current user's assessments using useAssessmentsForProjectQuery
 * - Provides search/filter via the shared MultiSelect component
 * - Displays selected assessments as removable badges
 */
export function AssessmentSelection({
  selected,
  onSelectedChangeAction,
  disabled = false,
  errors = null,
  id = "assessments",
}: AssessmentSelectionProps) {
  const {
    data: assessments = [],
    isLoading,
    error,
  } = useAssessmentsForProjectQuery();

  const options: Option[] = React.useMemo(
    () => assessments.map((a) => ({ value: a.id, label: a.name })),
    [assessments],
  );

  const handleSelectedChange = React.useCallback(
    (arr: unknown[]) => {
      onSelectedChangeAction(arr as string[]);
    },
    [onSelectedChangeAction],
  );

  return (
    <>
      <div className="mb-2">
        <h2 id="assessments-heading" className="text-lg font-semibold">
          Assessments
        </h2>
        <p id="assessments-help" className="text-sm text-gray-500">
          Search and select assessments to associate with this project.
        </p>
      </div>

      {isLoading && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-gray-600 mb-2"
        >
          Loading assessments...
        </p>
      )}
      {error && <ErrorAlert message={normalizeErrorMessage(error)} />}
      {!isLoading && options.length === 0 && !error && (
        <p className="text-sm text-gray-600 mb-2">No assessments available.</p>
      )}

      <MultiSelect
        id={id}
        options={options}
        defaultValue={selected}
        onValueChange={handleSelectedChange}
        placeholder={disabled ? "Disabled" : "Select assessments..."}
        className="w-full"
        aria-invalid={!!errors?.assessment_ids}
        aria-describedby={`assessments-help${errors?.assessment_ids ? " assessments-error" : ""}`}
        disabled={disabled}
        resetOnDefaultValueChange
        searchable
        deduplicateOptions
      />
      {errors?.assessment_ids && (
        <p
          id="assessments-error"
          className="text-sm text-red-600 mt-1"
          role="alert"
        >
          {String((errors.assessment_ids as { message?: unknown })?.message)}
        </p>
      )}
    </>
  );
}

export default AssessmentSelection;
