"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import ErrorAlert from "@/components/ui/error-alert";
import { normalizeErrorMessage } from "@/lib/errors";

export type FormActionsProps = {
  formId: string;
  submitting: boolean;
  error: unknown | null;
};

export function FormActions({ formId, submitting, error }: FormActionsProps) {
  return (
    <div>
      {error ? (
        <ErrorAlert variant="banner" message={normalizeErrorMessage(error)} />
      ) : null}
      <Button
        form={formId}
        type="submit"
        disabled={submitting}
        aria-describedby="submit-status"
      >
        {formId === "edit-issue-form"
          ? submitting
            ? "Saving..."
            : "Update Issue"
          : submitting
            ? "Creating..."
            : "Create Issue"}
      </Button>
      <span
        id="submit-status"
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {submitting
          ? formId === "edit-issue-form"
            ? "Saving issue..."
            : "Creating issue..."
          : ""}
      </span>
    </div>
  );
}

export default FormActions;
