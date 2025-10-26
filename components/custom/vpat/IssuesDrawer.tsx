"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useVpatIssuesByCriterion } from "@/lib/query/use-vpat-queries";
import { useIssueQuery } from "@/lib/query/use-issue-query";
import {
  IssueHeader,
  CoreFieldsDisplay,
  AttachmentsDisplay,
} from "@/components/custom/issues/IssueDetailPage";
import type { UUID } from "@/types/common";

export type CriterionMeta = {
  code: string;
  name: string;
  level: string | number;
};

type IssuesDrawerProps = {
  open: boolean;
  onClose: () => void;
  vpatId: UUID | string | null | undefined;
  criterion: CriterionMeta | null;
};

export default function IssuesDrawer({
  open,
  onClose,
  vpatId,
  criterion,
}: IssuesDrawerProps) {
  const [slideIndex, setSlideIndex] = useState(0);

  const selectedCode = criterion?.code ?? null;
  const { data: issuesForCode } = useVpatIssuesByCriterion(
    (vpatId as UUID) ?? null,
    selectedCode,
  );

  // Reset slideshow when criterion changes or drawer closes
  useEffect(() => {
    setSlideIndex(0);
  }, [selectedCode, open]);

  if (!open || !criterion) return null;

  return (
    <aside
      className="fixed top-0 right-0 h-full w-[34rem] bg-white dark:bg-card border-l border-border shadow-xl z-30 overflow-y-auto"
      aria-label="Issues drawer"
    >
      <div className="p-4 border-b border-border sticky top-0 bg-white dark:bg-card z-10">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {criterion.code} — {criterion.name} Issues
            </h2>
            <p className="text-xs text-muted-foreground">
              Level {criterion.level}
            </p>
          </div>
          <button
            className="text-sm underline"
            onClick={onClose}
            aria-label="Close issues drawer"
          >
            Close
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-muted-foreground">
            {issuesForCode?.length ?? 0} issue
            {(issuesForCode?.length ?? 0) === 1 ? "" : "s"}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              onClick={() => setSlideIndex((idx) => Math.max(0, idx - 1))}
              disabled={
                !issuesForCode || issuesForCode.length === 0 || slideIndex === 0
              }
              aria-label="Previous issue"
            >
              Prev
            </button>
            <span className="text-xs">
              {issuesForCode && issuesForCode.length > 0
                ? `${slideIndex + 1} / ${issuesForCode.length}`
                : "0 / 0"}
            </span>
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              onClick={() =>
                setSlideIndex((idx) =>
                  !issuesForCode
                    ? 0
                    : Math.min(issuesForCode.length - 1, idx + 1),
                )
              }
              disabled={
                !issuesForCode ||
                issuesForCode.length === 0 ||
                (issuesForCode ? slideIndex >= issuesForCode.length - 1 : true)
              }
              aria-label="Next issue"
            >
              Next
            </button>
          </div>
        </div>

        {issuesForCode && issuesForCode.length > 0 ? (
          <IssueSlide issueId={issuesForCode[slideIndex]} />
        ) : (
          <div className="text-sm text-muted-foreground">
            No issues for this criterion.
          </div>
        )}
      </div>
    </aside>
  );
}

function IssueSlide({ issueId }: { issueId: string }) {
  const { data, isLoading, error } = useIssueQuery({
    id: issueId,
    includeCriteria: true,
  });

  if (isLoading)
    return <div className="text-sm text-muted-foreground">Loading issue…</div>;
  if (error || !data)
    return <div className="text-sm text-red-600">Failed to load issue.</div>;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/issues/${data.id}`}
          className="underline text-base font-medium"
        >
          {data.title}
        </Link>
        <div className="mt-2">
          <IssueHeader
            title={data.title}
            severity={data.severity}
            status={data.status}
          />
        </div>
      </div>
      <CoreFieldsDisplay
        description={data.description}
        url={data.url}
        impact={data.impact}
        suggestedFix={data.suggested_fix}
        selector={data.selector}
        codeSnippet={data.code_snippet}
      />
      <AttachmentsDisplay screenshots={data.screenshots} />
    </div>
  );
}
