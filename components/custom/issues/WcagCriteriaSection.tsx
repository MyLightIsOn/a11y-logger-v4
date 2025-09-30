"use client";

import React from "react";
import { MultiSelect } from "@/components/ui/multi-select";
import ErrorAlert from "@/components/ui/error-alert";
import { normalizeErrorMessage } from "@/lib/errors";
import type { WcagCriteriaSectionProps } from "@/types/issues-ui";

export function WcagCriteriaSection({
  isLoading,
  error,
  allCriteria,
  selected,
  onSelectedChangeAction,
  disabled = false,
  version,
  wcagLevel,
  errors,
}: WcagCriteriaSectionProps) {
  const handleSelectedChange = React.useCallback(
    (arr: unknown[]) => {
      onSelectedChangeAction(arr as string[]);
    },
    [onSelectedChangeAction],
  );

  // Compute options from provided criteria, version, and level
  const computedOptions = React.useMemo(() => {
    if (!allCriteria || !version) return [];

    const dotAware = (a: string, b: string) => {
      const pa = a.split(".").map(Number);
      const pb = b.split(".").map(Number);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const da = pa[i] ?? 0;
        const db = pb[i] ?? 0;
        if (da !== db) return da - db;
      }
      return 0;
    };

    const allowedLevels = wcagLevel === "A" ? ["A"] : wcagLevel === "AA" ? ["A", "AA"] : wcagLevel === "AAA" ? ["A", "AA", "AAA"] : undefined;

    return (allCriteria || [])
      .filter((c) => {
        const versionMatch = c.version === version;
        const levelMatch = !allowedLevels || allowedLevels.includes(c.level);
        return versionMatch && levelMatch;
      })
      .sort((c1, c2) => dotAware(c1.code, c2.code))
      .map((c) => ({
        value: `${c.version}|${c.code}`,
        label: `${c.code} — ${c.name} (${c.level})`,
      }));
  }, [allCriteria, version, wcagLevel]);

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
        options={computedOptions}
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

export default React.memo(WcagCriteriaSection);
