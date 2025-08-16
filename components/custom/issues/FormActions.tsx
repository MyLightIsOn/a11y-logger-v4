"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export type FormActionsProps = {
  formId: string;
  submitting: boolean;
  error: string | null;
};

export function FormActions({ formId, submitting, error }: FormActionsProps) {
  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          {error}
        </div>
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
