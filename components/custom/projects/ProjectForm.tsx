"use client";

import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import ErrorAlert from "@/components/ui/error-alert";
import TagsSection from "@/components/custom/issues/TagsSection";
import { useTagsQuery } from "@/lib/query/use-tags-query";
import type { Option } from "@/types/options";
import type { Project } from "@/types/project";
import type { ProjectWithRelations } from "@/lib/api/projects";

export type ProjectFormValues = {
  name: string;
  description?: string;
  tag_ids?: string[];
  assessment_ids?: string[];
};

export interface ProjectFormProps {
  mode?: "create" | "edit";
  initialData?: ProjectWithRelations | Project; // allow basic Project as well
  submitting?: boolean;
  error?: unknown | null;
  onSubmit?: (values: ProjectFormValues) => void | Promise<void>;
  /**
   * Optional render-prop for injecting an Assessment multi-select UI without
   * coupling this component to a specific implementation yet.
   * This keeps us within the scope of step 3 (Project Form) without building
   * the separate AssessmentSelection component right now.
   */
  renderAssessmentSelection?: (args: {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
  }) => React.ReactNode;
}

/**
 * ProjectForm
 * - Reusable form for creating and editing Projects
 * - Mirrors structure and UX patterns from AssessmentForm
 * - Includes fields: name, description, tags, and a slot for assessment selection
 */
export function ProjectForm({
  mode = "create",
  initialData,
  submitting = false,
  error = null,
  onSubmit,
  renderAssessmentSelection,
}: ProjectFormProps) {
  const formId = mode === "edit" ? "edit-project-form" : "create-project-form";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<ProjectFormValues>({
    defaultValues: {
      name: "",
      description: "",
      tag_ids: [],
      assessment_ids: [],
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  // Pre-populate in edit mode
  useEffect(() => {
    if (!initialData) return;
    reset({
      name: initialData.name ?? "",
      description: (initialData as ProjectWithRelations)?.description ?? "",
      tag_ids:
        (initialData as ProjectWithRelations)?.tags?.map((t) => t.id) ?? [],
      assessment_ids:
        (initialData as ProjectWithRelations)?.assessments?.map((a) => a.id) ??
        [],
    });
  }, [initialData, reset]);

  // Warn before unload when there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty && !submitting) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, submitting]);

  // Tags data and options
  const {
    data: tags = [],
    isLoading: tagsLoading,
    error: tagsError,
  } = useTagsQuery();
  const tagOptions: Option[] = useMemo(
    () => tags.map((t) => ({ value: t.id, label: t.label })),
    [tags],
  );

  const selectedTagIds = watch("tag_ids") ?? [];
  const selectedAssessmentIds = watch("assessment_ids") ?? [];

  const internalSubmit = async (values: ProjectFormValues) => {
    const trimmedName = values.name?.trim();
    if (!trimmedName) {
      setValue("name", "");
      return;
    }
    if (onSubmit) await onSubmit({ ...values, name: trimmedName });
  };

  return (
    <>
      {error ? (
        <div className="mb-4">
          <ErrorAlert
            variant="banner"
            message={String((error as Error)?.message ?? error)}
          />
        </div>
      ) : null}
      <form id={formId} onSubmit={handleSubmit(internalSubmit)} noValidate>
        {/* Name */}
        <section className="bg-card rounded-lg mb-4">
          <label htmlFor="name" className="block text-xl font-bold">
            Name <span className="text-destructive">*</span>
          </label>
          <p id="project-name-help" className="text-sm text-gray-500 mb-1">
            Provide a concise name for the project.
          </p>
          <Input
            id="name"
            type="text"
            placeholder="Example: Accessibility Improvements Q3"
            aria-invalid={!!errors.name}
            aria-describedby={`project-name-help${errors.name ? " name-error" : ""}`}
            required
            {...register("name", { required: true })}
          />
          {errors.name && (
            <p
              id="name-error"
              className="text-sm text-red-600 mt-1"
              role="alert"
            >
              Name is required
            </p>
          )}
        </section>

        {/* Description */}
        <section className="bg-card rounded-lg mb-4">
          <label htmlFor="description" className="block text-xl font-bold">
            Description
          </label>
          <p
            id="project-description-help"
            className="text-sm text-gray-500 mb-1"
          >
            Optionally describe the scope and goals of this project.
          </p>
          <Textarea
            id="description"
            rows={4}
            placeholder="Example: Consolidates multiple audits and tracks ongoing fixes."
            aria-invalid={!!errors.description}
            aria-describedby={`project-description-help${errors.description ? " description-error" : ""}`}
            {...register("description")}
          />
          {errors.description && (
            <p
              id="description-error"
              className="text-sm text-red-600 mt-1"
              role="alert"
            >
              {String(errors.description.message)}
            </p>
          )}
        </section>

        {/* Assessment selection slot (multi-select) */}
        {typeof renderAssessmentSelection === "function" ? (
          <section className="bg-card rounded-lg mb-4">
            {renderAssessmentSelection({
              selectedIds: selectedAssessmentIds,
              onChange: (ids: string[]) =>
                setValue("assessment_ids", ids, { shouldValidate: false }),
            })}
          </section>
        ) : null}

        {/* Tags */}
        <TagsSection
          isLoading={tagsLoading}
          error={tagsError}
          options={tagOptions}
          selected={selectedTagIds}
          onSelectedChangeAction={(arr) =>
            setValue("tag_ids", arr, { shouldValidate: false })
          }
        />

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          <Button
            type="submit"
            disabled={submitting}
            aria-describedby="submit-status"
          >
            {mode === "edit"
              ? submitting
                ? "Saving..."
                : "Update Project"
              : submitting
                ? "Creating..."
                : "Create Project"}
          </Button>
          <span
            id="submit-status"
            role="status"
            aria-live="polite"
            className="sr-only"
          >
            {submitting
              ? mode === "edit"
                ? "Saving project..."
                : "Creating project..."
              : ""}
          </span>
        </div>
      </form>
    </>
  );
}

export default ProjectForm;
