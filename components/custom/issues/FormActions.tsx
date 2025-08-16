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
      {error && (
        <ErrorAlert variant="banner" message={normalizeErrorMessage(error)} />
      )}
      <Button form={formId} type="submit" disabled={submitting} aria-describedby="submit-status">
        {submitting ? "Creating..." : "Create Issue"}
      </Button>
      <span id="submit-status" role="status" aria-live="polite" className="sr-only">
        {submitting ? "Creating issue..." : ""}
      </span>
    </div>
  );
}

export default FormActions;
