"use client";

import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Report } from "@/lib/validation/report";
import { reportsApi } from "@/lib/api";
import { useAssessmentDetails } from "@/lib/query/use-assessment-details-query";
import IssueStatisticsChart from "@/components/custom/issue-statistics-chart";
import { getWcagByCode } from "@/lib/wcag/reference";
import { ArrowLeft, Edit, Trash2, Download } from "lucide-react";
import Link from "next/link";
import ButtonToolbar from "@/app/vpats/[vpatId]/ButtonToolbar";
import { LoadingIndicator } from "@/components/custom/projects/common";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { useDeleteReportMutation } from "@/lib/query/use-delete-report-mutation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function severityBadgeClasses(severity?: string) {
  switch (severity) {
    case "Critical":
      return "bg-red-100 border-red-800";
    case "High":
      return "bg-orange-100 border-orange-800";
    case "Medium":
      return "bg-yellow-100 border-yellow-800";
    default:
      return "bg-blue-100 border-blue-800"; // Low or undefined
  }
}

export default function ReportDetailsPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const router = useRouter();
  const [report, setReport] = React.useState<Report | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const deleteReports = useDeleteReportMutation();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

  // Fetch assessment issues to compute stats for charts (per planning step 18)
  const {
    assessment,
    issues,
    stats,
    isLoading: isAssessmentLoading,
    error: assessError,
  } = useAssessmentDetails(assessmentId);

  React.useEffect(() => {
    const load = async () => {
      if (!assessmentId) return;
      setLoading(true);
      setError(undefined);
      try {
        // Prefer sessionStorage (hand-off from generation)
        const key = `report:${assessmentId}`;
        const cached =
          typeof window !== "undefined"
            ? window.sessionStorage.getItem(key)
            : null;
        if (cached) {
          setReport(JSON.parse(cached) as Report);
          setLoading(false);
          return;
        }
        // Fallback: try GET latest (works if persistence is enabled)
        const res = await reportsApi.getLatest(assessmentId);
        if (res.success && res.data) {
          setReport(res.data as Report);
        } else {
          setError(
            res.error || "Report not found. Try generating a report first.",
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [assessmentId]);

  // Compute stats.by_severity from assessment stats
  const severityCounts = useMemo(() => {
    return {
      Critical: stats?.critical ?? 0,
      High: stats?.high ?? 0,
      Medium: stats?.medium ?? 0,
      Low: stats?.low ?? 0,
      Total:
        (stats?.critical ?? 0) +
        (stats?.high ?? 0) +
        (stats?.medium ?? 0) +
        (stats?.low ?? 0),
    } as const;
  }, [stats?.critical, stats?.high, stats?.medium, stats?.low]);

  // Compute stats.by_principle and stats.by_wcag from issues using wcag reference
  const { byWcag } = useMemo(() => {
    const ref = getWcagByCode();
    const issuesByCode = new Map<string, Set<string>>();
    for (const issue of issues || []) {
      const codes =
        (issue as { criteria_codes?: string[] }).criteria_codes || [];
      for (const raw of codes) {
        const code = typeof raw === "string" ? raw.trim() : "";
        if (!/^\d+\.\d+\.\d+$/.test(code)) continue;
        const s = issuesByCode.get(code) || new Set<string>();
        s.add(issue.id);
        issuesByCode.set(code, s);
      }
    }

    const wcagRows = Array.from(issuesByCode.entries())
      .map(([code, set]) => {
        const detail = ref.get(code);
        return {
          criterion: code,
          name: detail?.name || `Unknown criterion ${code}`,
          count: set.size,
        };
      })
      .sort((a, b) =>
        a.criterion < b.criterion ? -1 : a.criterion > b.criterion ? 1 : 0,
      );

    return { byWcag: wcagRows };
  }, [issues]);

  const isLoading = loading || isAssessmentLoading;
  const pageError = error || assessError?.message;

  return (
    <div className="container mx-auto px-4 py-8 min-h-full min-w-full">
      <div className="flex justify-between items-center mb-6">
        <Link
          href={`/assessments/${assessmentId}`}
          className="dark:text-white hover:underline flex items-center a11y-focus w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Assessment Detail
        </Link>
        <ButtonToolbar
          buttons={
            <>
              <Button
                variant="outline"
                onClick={() => router.push(`/reports/${assessmentId}/edit`)}
                disabled={!report}
              >
                Edit <Edit />
              </Button>
              {report ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className={"a11y-focus"}
                      variant="outline"
                      aria-label="Export report"
                    >
                      <Download /> Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className={"bg-white dark:bg-card-dark"}
                  >
                    <DropdownMenuItem disabled>Export as PDF</DropdownMenuItem>
                    <DropdownMenuItem disabled>Export as HTML</DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      Export as Markdown
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              <Button
                variant="destructive"
                disabled={deleteReports.isPending || !report}
                onClick={() => setIsDeleteModalOpen(true)}
                data-testid="delete-report-button"
              >
                {deleteReports.isPending ? "Deleting..." : "Delete"} <Trash2 />
              </Button>
            </>
          }
        />
      </div>

      {isLoading && <LoadingIndicator />}
      {pageError && (
        <div className="text-red-600">
          <p className="font-semibold">Error</p>
          <p>{pageError}</p>
        </div>
      )}

      {!isLoading && !pageError && report && (
        <>
          <h1 className="text-2xl font-bold mb-4">
            Report for {assessment?.name ?? assessmentId}
          </h1>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: summaries */}
            <div className="lg:col-span-2 space-y-6">
              <Card className={"shadow-md"}>
                <CardHeader>
                  <CardTitle>Executive Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {report.executive_summary.overview}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">Top Risks</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {report.executive_summary.top_risks.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Quick Wins</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {report.executive_summary.quick_wins.map(
                          (item, idx) => (
                            <li key={idx}>{item}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      Estimated User Impact:
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-black p-1 px-2 ${severityBadgeClasses(report.executive_summary.estimated_user_impact)}`}
                    >
                      {report.executive_summary.estimated_user_impact ===
                      "Critical" ? (
                        <p className={"flex items-center text-xs"}>
                          CRITICAL
                          <span
                            className={
                              "block w-3 h-3 rounded-full bg-red-400 ml-2"
                            }
                          />
                        </p>
                      ) : report.executive_summary.estimated_user_impact ===
                        "High" ? (
                        <p className={"flex items-center text-xs"}>
                          HIGH
                          <span
                            className={
                              "block w-3 h-3 rounded-full bg-orange-400 ml-2"
                            }
                          />
                        </p>
                      ) : report.executive_summary.estimated_user_impact ===
                        "Medium" ? (
                        <p className={"flex items-center text-xs"}>
                          MEDIUM
                          <span
                            className={
                              "block  w-3 h-3 rounded-full bg-yellow-400 ml-2"
                            }
                          />
                        </p>
                      ) : (
                        <p className={"flex items-center text-xs"}>
                          LOW
                          <span
                            className={
                              "block w-3 h-3 rounded-full bg-blue-400 ml-2"
                            }
                          />
                        </p>
                      )}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <h1 className="text-xl font-bold mb-4">Persona Summaries</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.persona_summaries.map((p) => (
                  <Card key={p.persona}>
                    <CardHeader>
                      <CardTitle>{p.persona}</CardTitle>
                    </CardHeader>
                    <CardContent>{p.summary}</CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Right column: stats and chart */}
            <div className="space-y-6">
              <Card>
                <CardContent>
                  <IssueStatisticsChart
                    criticalCount={severityCounts.Critical}
                    highCount={severityCounts.High}
                    mediumCount={severityCounts.Medium}
                    lowCount={severityCounts.Low}
                    totalCount={severityCounts.Total}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>WCAG by Criterion</CardTitle>
                </CardHeader>
                <CardContent>
                  {byWcag.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No WCAG criteria linked yet.
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-[420px] overflow-auto pr-2">
                      {byWcag.map((row) => (
                        <li
                          key={row.criterion}
                          className="flex items-center justify-between gap-2"
                        >
                          <span
                            className="text-md truncate"
                            title={`${row.criterion} - ${row.name}`}
                          >
                            {row.criterion} - {row.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className={
                              "text-primary bg-muted font-bold text-lg w-[35px] h-[35px]"
                            }
                          >
                            {row.count}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (!assessmentId) return;
          deleteReports.mutate(assessmentId, {
            onSuccess: () => {
              try {
                if (typeof window !== "undefined") {
                  window.sessionStorage.removeItem(`report:${assessmentId}`);
                }
              } catch {}
              router.push(`/assessments/${assessmentId}`);
            },
          });
        }}
        title="Delete all reports for this assessment?"
        message="This will permanently delete ALL reports associated with this assessment. This action cannot be undone."
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
      />
    </div>
  );
}
