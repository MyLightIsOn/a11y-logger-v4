"use client";
import React from "react";

export interface IssueDetailPageProps {
  readonly issueId: string;
}

export default function IssueDetailPage({ issueId }: IssueDetailPageProps) {
  // Step 1 placeholder: structure only. Data fetching and sections will be added in later steps.
  return (
    <div className="p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Issue Details</h1>
        <p className="text-sm text-muted-foreground mt-1">ID: {issueId}</p>
      </header>
      <div className="rounded-md border p-4 text-sm text-muted-foreground">
        This is a placeholder for the Issue Detail page. The read-only sections and data fetching will be implemented in subsequent steps.
      </div>
    </div>
  );
}
