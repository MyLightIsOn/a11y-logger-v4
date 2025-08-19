"use client";

import React from "react";
import { IssueForm } from "@/components/custom/issues/IssueForm";
import { useIssueQuery } from "@/lib/query/use-issue-query";
import type { IssueRead } from "@/types/issue";

interface EditIssueFormContainerProps {
  issueId: string;
}

export default function EditIssueFormContainer({ issueId }: EditIssueFormContainerProps) {
  const { data, isLoading, error } = useIssueQuery({ id: issueId, includeCriteria: true });

  if (isLoading) {
    return <div className="container mx-auto px-4 py-6">Loading issue…</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 text-destructive">
        Failed to load issue: {error.message}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-6 text-destructive">
        Issue not found.
      </div>
    );
  }

  const initialData: IssueRead = data;

  return <IssueForm mode="edit" issueId={issueId} initialData={initialData} />;
}
