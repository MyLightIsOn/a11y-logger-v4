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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <Button form={formId} type="submit" disabled={submitting}>
        {submitting ? "Creating..." : "Create Issue"}
      </Button>
    </div>
  );
}

export default FormActions;
