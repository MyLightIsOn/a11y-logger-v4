"use client";
import React, { useEffect, useMemo, useState } from "react";
import { issuesApi } from "@/lib/api";
import { Issue } from "@/types/issue";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import Link from "next/link";
import {
  LoadingIndicator,
  EmptyState,
  ErrorMessage,
} from "@/components/custom/issues/common";
import ViewModeToggle from "@/components/custom/view-mode-toggle";

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

export default function Page() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  // Persist view mode in localStorage
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("issues:viewMode") : null;
    if (saved === "table" || saved === "card") setViewMode(saved);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("issues:viewMode", viewMode);
    }
  }, [viewMode]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await issuesApi.getIssues({ sortBy: "created_at", sortOrder: "desc" });
      if (response.success && response.data) {
        setIssues(response.data.data || []);
      } else {
        throw new Error(response.error || "Failed to fetch issues");
      }
    } catch (err) {
      console.error("Error fetching issues:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const columns: DataTableColumn<Issue>[] = useMemo(
    () => [
      {
        header: "Title",
        accessorKey: "title",
        sortable: true,
        cell: (issue: Issue) => (
          <span className="line-clamp-2 font-bold">{issue.title}</span>
        ),
      },
      {
        header: "Criteria",
        accessorKey: "criteria",
        sortable: true,
        cell: (issue: Issue) => (
          <div className="flex flex-wrap gap-1">
            {issue.criteria && issue.criteria.trim().length > 0 ? (
              <Badge
                variant="outline"
                className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full"
              >
                {issue.criteria}
              </Badge>
            ) : (
              <span className="text-gray-500 text-xs">No criteria</span>
            )}
          </div>
        ),
      },
      {
        header: "Severity",
        accessorKey: "severity",
        sortable: true,
        cell: (issue: Issue) => (
          <Badge
            variant="outline"
            className={`text-black p-1 px-2 ${severityBadgeClasses(issue.severity)}`}
          >
            {issue.severity === "1" ? (
              <p className={"flex items-center text-xs"}>
                CRITICAL
                <span className={"block w-3 h-3 rounded-full bg-red-400 ml-2"} />
              </p>
            ) : issue.severity === "2" ? (
              <p className={"flex items-center text-xs"}>
                HIGH
                <span className={"block w-3 h-3 rounded-full bg-orange-400 ml-2"} />
              </p>
            ) : issue.severity === "3" ? (
              <p className={"flex items-center text-xs"}>
                MEDIUM
                <span className={"block  w-3 h-3 rounded-full bg-yellow-400 ml-2"} />
              </p>
            ) : (
              <p className={"flex items-center text-xs"}>
                LOW
                <span className={"block w-3 h-3 rounded-full bg-blue-400 ml-2"} />
              </p>
            )}
          </Badge>
        ),
      },
      {
        header: "Tags",
        accessorKey: "tags",
        sortable: false,
        hidden: true, // keep parity with prototype default hidden
        cell: (issue: Issue) => (
          <span className="line-clamp-2">
            {issue.tags && issue.tags.length > 0
              ? issue.tags.map((t) => t.label).join(", ")
              : "None"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="container mx-auto px-4 py-8 min-h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Issues</h1>
        <div className="flex items-center gap-2">
          <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>
      </div>

      <ErrorMessage message={error} />

      {loading ? (
        <LoadingIndicator />
      ) : issues.length === 0 ? (
        <EmptyState />
      ) : viewMode === "table" ? (
        <DataTable<Issue>
          data={issues}
          columns={columns}
          data-testid="issues-table"
        />
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          data-testid="issues-grid"
        >
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-border"
              data-testid={`issue-card-${issue.id}`}
            >
              <Link href={`/issues/${issue.id}`} className="block focus:outline-dashed focus:outline-4 focus:outline-offset-4 focus:outline-primary a11y-focus">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="text-xl font-semibold mb-2 flex-1 pr-3">
                      {issue.title}
                    </h2>
                    <Badge
                      variant="outline"
                      className={`text-black p-1 px-2 ${severityBadgeClasses(issue.severity)}`}
                    >
                      {issue.severity === "1" ? (
                        <p className={"flex items-center text-xs"}>
                          CRITICAL
                          <span className={"block w-3 h-3 rounded-full bg-red-400 ml-2"} />
                        </p>
                      ) : issue.severity === "2" ? (
                        <p className={"flex items-center text-xs"}>
                          HIGH
                          <span className={"block w-3 h-3 rounded-full bg-orange-400 ml-2"} />
                        </p>
                      ) : issue.severity === "3" ? (
                        <p className={"flex items-center text-xs"}>
                          MEDIUM
                          <span className={"block  w-3 h-3 rounded-full bg-yellow-400 ml-2"} />
                        </p>
                      ) : (
                        <p className={"flex items-center text-xs"}>
                          LOW
                          <span className={"block w-3 h-3 rounded-full bg-blue-400 ml-2"} />
                        </p>
                      )}
                    </Badge>
                  </div>

                  {issue.description && (
                    <p className="text-foreground mb-4 text-sm leading-relaxed line-clamp-2">
                      {issue.description}
                    </p>
                  )}

                  <div className="mt-2 border-t border-border pt-4">
                    <p className="text-sm font-medium mb-1">Tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {issue.tags && issue.tags.length > 0 ? (
                        issue.tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                          >
                            {tag.label}
                          </Badge>
                        ))
                      ) : (
                        <p>None</p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
