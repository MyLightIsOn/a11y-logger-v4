"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTagsQuery } from "@/lib/query/use-tags-query";
import TagsSection from "@/components/custom/issues/TagsSection";
import ErrorAlert from "@/components/ui/error-alert";
import type { Assessment } from "@/types/assessment";
import type { WcagVersion } from "@/types/issue";
import type { Option } from "@/types/options";

export type AssessmentFormValues = {
  name: string;
  description?: string;
  wcag_version: WcagVersion | "";
  tag_ids?: string[];
};

export interface AssessmentFormProps {
  mode?: "create" | "edit";
  initialData?: Assessment; // optional pre-population
  submitting?: boolean; // external submitting state if parent controls submission
  error?: unknown | null; // error to display consistently
  issueCount?: number; // number of existing issues linked to this assessment (for WCAG change warning)
  onSubmit?: (values: AssessmentFormValues) => void | Promise<void>;
}

/**
 * AssessmentForm
 * - Reusable form for creating and editing Assessments
 * - Mirrors patterns and styling from the IssueForm/CoreFields/TagsSection
 * - Keeps submission handling pluggable via onSubmit prop
 */
export function AssessmentForm({
  mode = "create",
  initialData,
  submitting = false,
  error = null,
  issueCount = 0,
  onSubmit,
}: AssessmentFormProps) {
  const formId =
    mode === "edit" ? "edit-assessment-form" : "create-assessment-form";
  // State for WCAG version change confirmation
  const [showVersionConfirm, setShowVersionConfirm] = useState(false);
  const [pendingVersion, setPendingVersion] = useState<WcagVersion | "">("");
  const wcagTriggerRef = useRef<HTMLButtonElement | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<AssessmentFormValues>({
    defaultValues: {
      name: "",
      description: "",
      wcag_version: "",
      tag_ids: [],
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
      description: initialData.description ?? "",
      wcag_version: (initialData.wcag_version as WcagVersion) ?? "",
      tag_ids: (initialData.tags ?? []).map((t) => t.id),
    });
  }, [initialData, reset]);

  // Warn on unload when there are unsaved changes (dirty form)
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
  const currentVersion = (watch("wcag_version") || "") as WcagVersion | "";
  const initialVersion =
    (initialData?.wcag_version as WcagVersion | undefined) || undefined;
  const showVersionWarning =
    mode === "edit" &&
    (issueCount ?? 0) > 0 &&
    initialVersion &&
    currentVersion &&
    currentVersion !== initialVersion;

  const internalSubmit = async (values: AssessmentFormValues) => {
    // naive required checks (Zod schema will be added in a later step per plan)
    const trimmedName = values.name?.trim();
    if (!trimmedName) {
      // RHF simple setError alternative: update value and rely on required attribute
      setValue("name", "");
      return;
    }
    if (!values.wcag_version) {
      setValue("wcag_version", "");
      return;
    }

    if (onSubmit) await onSubmit({ ...values, name: trimmedName });
    // Otherwise, do nothing – parent will handle navigation/mutations in later steps
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
        <section className="bg-card rounded-lg p-4 border border-border mb-4">
          <label htmlFor="name" className="block text-xl font-bold">
            Name <span className="text-destructive">*</span>
          </label>
          <p id="name-help" className="text-sm text-gray-500 mb-1">
            Provide a concise name for the assessment.
          </p>
          <Input
            id="name"
            type="text"
            placeholder="Example: Homepage Accessibility Audit"
            aria-invalid={!!errors.name}
            aria-describedby={`name-help${errors.name ? " name-error" : ""}`}
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
        <section className="bg-card rounded-lg p-4 border border-border mb-4">
          <label htmlFor="description" className="block text-xl font-bold">
            Description
          </label>
          <p id="description-help" className="text-sm text-gray-500 mb-1">
            Optionally describe the scope and goals of this assessment.
          </p>
          <Textarea
            id="description"
            rows={4}
            placeholder="Example: Covers the main flows for unauthenticated users on the marketing site."
            aria-invalid={!!errors.description}
            aria-describedby={`description-help${errors.description ? " description-error" : ""}`}
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

        {/* WCAG Version */}
        <section className="bg-card rounded-lg p-4 border border-border mb-4">
          <label htmlFor="wcag_version" className="block text-xl font-bold">
            WCAG Version <span className="text-destructive">*</span>
          </label>
          <p id="wcag-version-help" className="text-sm text-gray-500 mb-1">
            Select the WCAG version this assessment targets.
          </p>
          <Select
            value={currentVersion || ""}
            onValueChange={(v) => {
              if (
                mode === "edit" &&
                (issueCount ?? 0) > 0 &&
                initialData?.wcag_version &&
                v !== (initialData.wcag_version as string)
              ) {
                setPendingVersion(v as WcagVersion);
                setShowVersionConfirm(true);
              } else {
                setValue("wcag_version", v as WcagVersion, {
                  shouldValidate: true,
                });
              }
            }}
          >
            <SelectTrigger
              ref={wcagTriggerRef as unknown as React.Ref<HTMLButtonElement>}
              id="wcag_version"
              className="w-full py-6 text-lg"
              aria-invalid={!!errors.wcag_version}
              aria-describedby={`wcag-version-help${errors.wcag_version ? " wcag-version-error" : ""}`}
            >
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2.0">WCAG 2.0</SelectItem>
              <SelectItem value="2.1">WCAG 2.1</SelectItem>
              <SelectItem value="2.2">WCAG 2.2</SelectItem>
            </SelectContent>
          </Select>
          {showVersionWarning && (
            <div className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              Changing WCAG version may affect existing issues linked to this
              assessment.
            </div>
          )}
          {errors.wcag_version && (
            <p
              id="wcag-version-error"
              className="text-sm text-red-600 mt-1"
              role="alert"
            >
              WCAG Version is required
            </p>
          )}
        </section>

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
                : "Update Assessment"
              : submitting
                ? "Creating..."
                : "Create Assessment"}
          </Button>
          <span
            id="submit-status"
            role="status"
            aria-live="polite"
            className="sr-only"
          >
            {submitting
              ? mode === "edit"
                ? "Saving assessment..."
                : "Creating assessment..."
              : ""}
          </span>
        </div>
      </form>
    </>
  );
}

export default AssessmentForm;
