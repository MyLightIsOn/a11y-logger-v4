"use client";

import React from "react";
import IssueForm from "@/components/custom/issues/IssueForm";
import { useParams } from "next/navigation";
import { useIssueQuery } from "@/lib/query/use-issue-query";
import type { CreateIssueInput } from "@/lib/validation/issues";

function EditIssueFormContainer() {
  const params = useParams();
  const issueId = (params?.id as string) || "";

  const { data, isLoading, error } = useIssueQuery({
    id: issueId,
    includeCriteria: true,
    enabled: Boolean(issueId),
  });

  if (!issueId) return <div>Issue ID is missing</div>;
  if (isLoading) return <div>Loading form…</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>Issue not found</div>;

  // Map IssueRead -> Partial<CreateIssueInput>
  const initialValues: Partial<CreateIssueInput> = {
    title: data.title,
    description: data.description,
    severity: data.severity,
    status: data.status ?? "open",
    suggested_fix: data.suggested_fix,
    impact: data.impact,
    url: data.url,
    selector: data.selector,
    code_snippet: data.code_snippet,
    browser: data.browser,
    operating_system: data.operating_system,
    assistive_technology: data.assistive_technology,
    screenshots: data.screenshots ?? [],
    tag_ids: (data.tags || []).map((t) => t.id),
    criteria: Array.isArray(data.criteria)
      ? data.criteria.map((c) => ({ version: c.version, code: c.code }))
      : [],
    assessment_id: data.assessment?.id,
  };
  return (
    <div>
      <IssueForm mode="edit" issueId={issueId} initialValues={initialValues} />
    </div>
  );
}

export default EditIssueFormContainer;
