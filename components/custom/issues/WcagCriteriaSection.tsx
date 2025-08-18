"use client";

import React from "react";
import { Label } from "@/components/ui/label";
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
      className="bg-card rounded-lg p-4 border border-border"
    >
      <h2 id="wcag-heading" className="text-lg font-semibold mb-4">
        WCAG Criteria
      </h2>

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

      {!isLoading && options.length === 0 && !error && (
        <p className="text-sm text-gray-600 mb-2">
          No WCAG criteria available for this version.
        </p>
      )}

      <Label htmlFor="criteria">Criteria</Label>
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
      <p id="criteria-help" className="text-sm text-gray-500 mt-2">
        Select one or more criteria that apply to this issue.
      </p>
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
