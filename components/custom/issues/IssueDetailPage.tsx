"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageModal } from "@/components/custom/image-modal";
import { useIssueQuery } from "@/lib/query/use-issue-query";
import type { IssueRead, IssueCriteriaItem } from "@/types/issue";
import type { Tag } from "@/types/tag";
import { LoadingIndicator, ErrorMessage } from "./common";

// Local helper to map severity to color classes (kept in sync with list page)
function severityBadgeClasses(severity?: string) {
  switch (severity) {
    case "1":
      return "bg-red-100 border-red-800";
    case "2":
      return "bg-orange-100 border-orange-800";
    case "3":
      return "bg-yellow-100 border-yellow-800";
    default:
      return "bg-blue-100 border-blue-800"; // "4" or undefined
  }
}

export interface IssueDetailPageProps {
  issueId: string;
}

/**
 * Main Issue Detail Page component (read-only)
 * Orchestrates data loading and renders read-only sections.
 */
export default function IssueDetailPage({ issueId }: IssueDetailPageProps) {
  const { data, isLoading, error } = useIssueQuery({ id: issueId, includeCriteria: true });

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  if (!data) {
    return <ErrorMessage message="Issue not found" />;
  }

  const issue: IssueRead = data;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-start mb-6">
        <IssueHeader
          title={issue.title}
          severity={issue.severity}
          status={issue.status}
        />
        <Link href={`/issues/${issue.id}/edit`}>
          <Button aria-label="Edit issue">Edit</Button>
        </Link>
      </div>

      <div className="flex flex-wrap">
        <div className="w-full md:w-2/3 p-2">
          <CoreFieldsDisplay
            description={issue.description}
            url={issue.url}
            impact={issue.impact}
            suggestedFix={issue.suggested_fix}
            selector={issue.selector}
            codeSnippet={issue.code_snippet}
          />

          <WcagCriteriaDisplay criteria={issue.criteria} criteriaCodes={issue.criteria_codes} />

          <TagsDisplay tags={issue.tags} />
        </div>

        <div className="w-full md:w-1/3 p-2">
          <AttachmentsDisplay screenshots={issue.screenshots} />
          <MetadataDisplay createdAt={issue.created_at} updatedAt={issue.updated_at} />
        </div>
      </div>
    </div>
  );
}

// Section Components (read-only)

interface IssueHeaderProps {
  title: string;
  status: string;
  severity: string;
}

export function IssueHeader({ title, status, severity }: IssueHeaderProps) {
  return (
    <header className="flex items-start gap-3 flex-wrap">
      <h1 className="text-2xl font-bold flex-1 pr-2">{title}</h1>
      <Badge variant="outline" className="px-2 py-1 text-xs bg-gray-100 border-gray-400 text-gray-800">
        {status === "open" ? "Open" : status === "closed" ? "Closed" : "Archived"}
      </Badge>
      <Badge
        variant="outline"
        className={`text-black p-1 px-2 ${severityBadgeClasses(severity)}`}
        aria-label={`Severity ${severity}`}
      >
        {severity === "1" ? (
          <p className="flex items-center text-xs">
            CRITICAL <span className="block w-3 h-3 rounded-full bg-red-400 ml-2" />
          </p>
        ) : severity === "2" ? (
          <p className="flex items-center text-xs">
            HIGH <span className="block w-3 h-3 rounded-full bg-orange-400 ml-2" />
          </p>
        ) : severity === "3" ? (
          <p className="flex items-center text-xs">
            MEDIUM <span className="block w-3 h-3 rounded-full bg-yellow-400 ml-2" />
          </p>
        ) : (
          <p className="flex items-center text-xs">
            LOW <span className="block w-3 h-3 rounded-full bg-blue-400 ml-2" />
          </p>
        )}
      </Badge>
    </header>
  );
}

interface CoreFieldsDisplayProps {
  description?: string;
  url?: string;
  impact?: string;
  suggestedFix?: string;
  selector?: string;
  codeSnippet?: string;
}

export function CoreFieldsDisplay({
  description,
  url,
  impact,
  suggestedFix,
  selector,
  codeSnippet,
}: CoreFieldsDisplayProps) {
  return (
    <section className="space-y-4">
      <div className="bg-card rounded-lg p-4 border border-border">
        <h2 className="text-lg font-semibold mb-2">Description</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {description || "No description provided."}
        </p>
      </div>

      <div className="bg-card rounded-lg p-4 border border-border">
        <h2 className="text-lg font-semibold mb-2">URL</h2>
        {url ? (
          <Link href={url} target="_blank" className="text-blue-600 underline break-all">
            {url}
          </Link>
        ) : (
          <p className="text-sm text-gray-600">No URL provided.</p>
        )}
      </div>

      <div className="bg-card rounded-lg p-4 border border-border">
        <h2 className="text-lg font-semibold mb-2">Impact</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {impact || "No impact specified."}
        </p>
      </div>

      <div className="bg-card rounded-lg p-4 border border-border">
        <h2 className="text-lg font-semibold mb-2">Suggested Fix</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {suggestedFix || "No suggestion provided."}
        </p>
      </div>

      {(selector || codeSnippet) && (
        <div className="bg-card rounded-lg p-4 border border-border">
          <h2 className="text-lg font-semibold mb-2">Technical Details</h2>
          {selector && (
            <p className="text-sm mb-2"><span className="font-medium">Selector:</span> {selector}</p>
          )}
          {codeSnippet && (
            <pre className="text-xs p-3 rounded bg-muted overflow-auto border border-border">
              {codeSnippet}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}

interface WcagCriteriaDisplayProps {
  criteria?: IssueCriteriaItem[];
  criteriaCodes?: string[];
}

export function WcagCriteriaDisplay({ criteria, criteriaCodes }: WcagCriteriaDisplayProps) {
  const hasRich = Array.isArray(criteria) && criteria.length > 0;
  const hasCodes = Array.isArray(criteriaCodes) && criteriaCodes.length > 0;

  return (
    <section className="bg-card rounded-lg p-4 border border-border mt-4">
      <h2 className="text-lg font-semibold mb-2">WCAG Criteria</h2>
      {hasRich ? (
        <ul className="list-disc pl-5 text-sm">
          {criteria!.map((c) => (
            <li key={`${c.version}|${c.code}`}>
              <span className="font-medium">{c.code}</span> — {c.name} ({c.level}) • v{c.version}
            </li>
          ))}
        </ul>
      ) : hasCodes ? (
        <p className="text-sm">{criteriaCodes!.join(", ")}</p>
      ) : (
        <p className="text-sm text-gray-600">No criteria linked.</p>
      )}
    </section>
  );
}

interface TagsDisplayProps {
  tags?: Tag[];
}

export function TagsDisplay({ tags }: TagsDisplayProps) {
  return (
    <section className="bg-card rounded-lg p-4 border border-border mt-4">
      <h2 className="text-lg font-semibold mb-2">Tags</h2>
      <div className="flex flex-wrap gap-2">
        {tags && tags.length > 0 ? (
          tags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
            >
              {tag.label}
            </Badge>
          ))
        ) : (
          <p className="text-sm text-gray-600">None</p>
        )}
      </div>
    </section>
  );
}

interface AttachmentsDisplayProps {
  screenshots: string[];
}

export function AttachmentsDisplay({ screenshots }: AttachmentsDisplayProps) {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [currentUrl, setCurrentUrl] = React.useState<string>("");
  const [currentAlt, setCurrentAlt] = React.useState<string>("");
  const [triggerRef, setTriggerRef] = React.useState<React.RefObject<HTMLDivElement | null> | null>(null);

  const handleOpen = (
    url: string,
    alt: string,
    ref: React.RefObject<HTMLDivElement | null>,
  ) => {
    setCurrentUrl(url);
    setCurrentAlt(alt);
    setTriggerRef(ref);
    setIsOpen(true);
  };

  return (
    <section className="bg-card rounded-lg p-4 border border-border mb-4">
      <h2 className="text-lg font-semibold mb-2">Screenshots</h2>
      {screenshots.length === 0 ? (
        <p className="text-sm text-gray-600">No screenshots attached.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {screenshots.map((url, idx) => {
            const alt = `Screenshot ${idx + 1}`;
            const ref = React.createRef<HTMLDivElement>();
            return (
              <div
                key={url}
                ref={ref}
                tabIndex={0}
                role="button"
                aria-label={`Open ${alt}`}
                className="relative group focus:outline-dashed focus:outline-4 focus:outline-offset-4 focus:outline-primary a11y-focus"
                onClick={() => handleOpen(url, alt, ref)}
                onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpen(url, alt, ref);
                  }
                }}
              >
                <Image
                  src={url}
                  alt={alt}
                  width={300}
                  height={160}
                  className="h-40 w-full object-cover rounded-md"
                  unoptimized
                />
              </div>
            );
          })}
        </div>
      )}

      {isOpen && triggerRef && (
        <ImageModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          imageUrl={currentUrl}
          alt={currentAlt}
          triggerRef={triggerRef}
        />
      )}
    </section>
  );
}

interface MetadataDisplayProps {
  createdAt: string;
  updatedAt: string;
}

export function MetadataDisplay({ createdAt, updatedAt }: MetadataDisplayProps) {
  const fmt = (s: string) => {
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleString();
  };

  return (
    <section className="bg-card rounded-lg p-4 border border-border">
      <h2 className="text-lg font-semibold mb-2">Metadata</h2>
      <dl className="text-sm">
        <div className="flex justify-between py-1">
          <dt className="text-muted-foreground">Created</dt>
          <dd>{fmt(createdAt)}</dd>
        </div>
        <div className="flex justify-between py-1">
          <dt className="text-muted-foreground">Updated</dt>
          <dd>{fmt(updatedAt)}</dd>
        </div>
      </dl>
    </section>
  );
}
