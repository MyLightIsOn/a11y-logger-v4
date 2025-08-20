"use client";

import React from "react";
import { MultiSelect } from "@/components/ui/multi-select";
import ErrorAlert from "@/components/ui/error-alert";
import { normalizeErrorMessage } from "@/lib/errors";
import type { WcagCriteriaSectionProps } from "@/types/issues-ui";

export function WcagCriteriaSection({
  isLoading,
  error,
  options,
  selected,
  onSelectedChangeAction,
  disabled = false,
  version,
  errors,
}: WcagCriteriaSectionProps) {
  const handleSelectedChange = React.useCallback(
    (arr: unknown[]) => {
      onSelectedChangeAction(arr as string[]);
    },
    [onSelectedChangeAction],
  );

  return (
    <section
      aria-labelledby="wcag-heading"
      className="bg-card rounded-lg p-4 border border-border mb-4"
    >
      <label htmlFor="criteria" className="block text-xl font-bold">
        WCAG Criteria
      </label>

      {typeof version === "string" && (
        <p className="text-sm text-gray-600 mb-3">
          Assessment WCAG version: <strong>{version}</strong>
        </p>
      )}

      {isLoading && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-gray-600 mb-2"
        >
          Loading WCAG criteria...
        </p>
      )}
      {error && <ErrorAlert message={normalizeErrorMessage(error)} />}

      <p className="text-sm text-gray-500 mb-1">
        Select one or more criteria that apply to this issue.
      </p>

      <MultiSelect
        id="criteria"
        options={options}
        defaultValue={selected}
        onValueChange={handleSelectedChange}
        placeholder={
          disabled
            ? "Select an assessment to choose criteria"
            : "Search and select WCAG criteria..."
        }
        className="w-full"
        aria-invalid={!!errors?.criteria}
        aria-describedby={`criteria-help${errors?.criteria ? " criteria-error" : ""}`}
        disabled={disabled}
      />
      {errors?.criteria && (
        <p
          id="criteria-error"
          className="text-sm text-red-600 mt-1"
          role="alert"
        >
          {String((errors.criteria as { message?: unknown })?.message)}
        </p>
      )}
    </section>
  );
}

export default WcagCriteriaSection;
