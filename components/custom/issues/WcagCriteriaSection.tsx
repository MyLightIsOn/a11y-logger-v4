"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import ErrorAlert from "@/components/ui/error-alert";
import { normalizeErrorMessage } from "@/lib/errors";
import type { WcagCriteriaSectionProps } from "@/types/issues-ui";
import type { WcagVersion } from "@/types/issue";

function isWcagVersion(value: string): value is WcagVersion {
  return value === "2.1" || value === "2.2";
}

function toVersionFilter(value: string): WcagVersion | "all" {
  return isWcagVersion(value) ? value : "all";
}

function isWcagLevel(value: string): value is "A" | "AA" | "AAA" {
  return value === "A" || value === "AA" || value === "AAA";
}

function toLevelFilter(value: string): "all" | "A" | "AA" | "AAA" {
  return isWcagLevel(value) ? value : "all";
}

export function WcagCriteriaSection({
  isLoading,
  error,
  versionFilter,
  onVersionFilterChangeAction,
  levelFilter,
  onLevelFilterChangeAction,
  options,
  selected,
  onSelectedChangeAction,
  errors,
}: WcagCriteriaSectionProps) {
  const handleVersionChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onVersionFilterChangeAction(toVersionFilter(e.target.value));
    },
    [onVersionFilterChangeAction],
  );

  const handleLevelChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onLevelFilterChangeAction(toLevelFilter(e.target.value));
    },
    [onLevelFilterChangeAction],
  );

  const handleSelectedChange = React.useCallback(
    (arr: unknown[]) => {
      onSelectedChangeAction(arr as string[]);
    },
    [onSelectedChangeAction],
  );

  return (
    <section aria-labelledby="wcag-heading" className="bg-card rounded-lg p-4 border border-border">
      <h2 id="wcag-heading" className="text-lg font-semibold mb-4">
        WCAG Criteria
      </h2>
      {isLoading && (
        <p role="status" aria-live="polite" className="text-sm text-gray-600 mb-2">
          Loading WCAG criteria...
        </p>
      )}
      {error && (
        <ErrorAlert message={normalizeErrorMessage(error)} />
      )}
      {!isLoading && options.length === 0 && !error && (
        <p className="text-sm text-gray-600 mb-2">No WCAG criteria available.</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
        <div>
          <Label htmlFor="wcag-version">Version</Label>
          <select
            id="wcag-version"
            className="w-full h-10 rounded-md border border-gray-300 px-3 a11y-focus"
            value={versionFilter}
            onChange={handleVersionChange}
            aria-label="WCAG Version filter"
          >
            <option value="all">All</option>
            <option value="2.1">2.1</option>
            <option value="2.2">2.2</option>
          </select>
        </div>
        <div>
          <Label htmlFor="wcag-level">Level</Label>
          <select
            id="wcag-level"
            className="w-full h-10 rounded-md border border-gray-300 px-3 a11y-focus"
            value={levelFilter}
            onChange={handleLevelChange}
            aria-label="WCAG Level filter"
          >
            <option value="all">All</option>
            <option value="A">A</option>
            <option value="AA">AA</option>
            <option value="AAA">AAA</option>
          </select>
        </div>
      </div>
      <Label htmlFor="criteria">Criteria</Label>
      <MultiSelect
        id="criteria"
        options={options}
        selected={selected}
        onChangeAction={handleSelectedChange}
        placeholder="Search and select WCAG criteria..."
        className="w-full"
        aria-invalid={!!errors?.criteria}
        aria-describedby={`criteria-help${errors?.criteria ? ' criteria-error' : ''}`}
      />
      <p id="criteria-help" className="text-sm text-gray-500 mt-2">Select at least one criterion.</p>
      {errors?.criteria && (
        <p id="criteria-error" className="text-sm text-red-600 mt-1" role="alert">
          {String((errors.criteria as { message?: unknown })?.message)}
        </p>
      )}
    </section>
  );
}

export default WcagCriteriaSection;
