"use client";

import React from "react";
import { MultiSelect } from "@/components/ui/multi-select";

export type Option = { value: string; label: string };

export type TagsSectionProps = {
  isLoading: boolean;
  error: Error | null | undefined;
  options: Option[];
  selected: string[];
  onSelectedChange: (arr: string[]) => void;
};

export function TagsSection({ isLoading, error, options, selected, onSelectedChange }: TagsSectionProps) {
  return (
    <section aria-labelledby="tags-heading" className="bg-card rounded-lg p-4 border border-border">
      <h2 id="tags-heading" className="text-lg font-semibold mb-4">
        Tags
      </h2>
      {isLoading && (
        <p role="status" className="text-sm text-gray-600 mb-2">
          Loading tags...
        </p>
      )}
      {error && (
        <p role="status" className="text-sm text-red-700 mb-2">{error.message}</p>
      )}
      {!isLoading && options.length === 0 && !error && (
        <p className="text-sm text-gray-600 mb-2">No tags available.</p>
      )}
      <MultiSelect
        id="tags"
        options={options}
        selected={selected}
        onChangeAction={(arr) => onSelectedChange(arr as string[])}
        placeholder="Select tags..."
        className="w-full"
      />
      <p className="text-sm text-gray-500 mt-2">
        Tags are optional. This environment may not have predefined tags yet.
      </p>
    </section>
  );
}

export default TagsSection;
