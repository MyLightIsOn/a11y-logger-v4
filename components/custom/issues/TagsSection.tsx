"use client";

import React from "react";
import { MultiSelect } from "@/components/ui/multi-select";
import ErrorAlert from "@/components/ui/error-alert";
import { normalizeErrorMessage } from "@/lib/errors";
import { TagsSectionProps } from "@/types/tag";

export function TagsSection({
  isLoading,
  error,
  options,
  selected,
  onSelectedChangeAction,
}: TagsSectionProps) {
  const handleSelectedChange = React.useCallback(
    (arr: unknown[]) => {
      onSelectedChangeAction(arr as string[]);
    },
    [onSelectedChangeAction],
  );

  return (
    <section
      aria-labelledby="tags-heading"
      className="bg-card rounded-lg p-4 border border-border"
    >
      <h2 id="tags-heading" className="text-lg font-semibold mb-4">
        Tags
      </h2>
      {isLoading && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-gray-600 mb-2"
        >
          Loading tags...
        </p>
      )}
      {error && <ErrorAlert message={normalizeErrorMessage(error)} />}
      {!isLoading && options.length === 0 && !error && (
        <p className="text-sm text-gray-600 mb-2">No tags available.</p>
      )}
      <MultiSelect
        id="tags"
        options={options}
        defaultValue={selected}
        onValueChange={handleSelectedChange}
        placeholder="Select tags..."
        className="w-full"
        aria-describedby="tags-help"
      />
      <p id="tags-help" className="text-sm text-gray-500 mt-2">
        Tags are optional. This environment may not have predefined tags yet.
      </p>
    </section>
  );
}

export default TagsSection;
