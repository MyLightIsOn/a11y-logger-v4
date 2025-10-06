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
import { useSaveReport } from "@/lib/query/use-save-report-mutation";

export default function ReportDetailsPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const router = useRouter();
  const [report, setReport] = React.useState<Report | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);

  // Fetch assessment issues to compute stats for charts (per planning step 18)
  const {
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

  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
  const {
    save,
    isPending: isSaving,
    error: saveError,
  } = useSaveReport(assessmentId, () => {
    setSaveMessage("Report saved successfully.");
    setTimeout(() => setSaveMessage(null), 4000);
  });

  const handleSave = React.useCallback(() => {
    if (!report || !assessmentId) return;
    setSaveMessage(null);
    save(report);
  }, [assessmentId, report, save]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:justify-between md:items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          {saveMessage && (
            <span className="text-green-600 text-sm">{saveMessage}</span>
          )}
          {saveError && (
            <span className="text-red-600 text-sm">{saveError.message}</span>
          )}
        </div>
        <h1 className="text-2xl font-bold">Report Details</h1>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={!report || isSaving}>
            {isSaving ? "Saving..." : "Save Report"}
          </Button>
        </div>
      </div>

      {isLoading && <p>Loading report...</p>}
      {pageError && (
        <div className="text-red-600">
          <p className="font-semibold">Error</p>
          <p>{pageError}</p>
        </div>
      )}

      {!isLoading && !pageError && report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: summaries */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
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
                      {report.executive_summary.quick_wins.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Estimated User Impact:</span>
                  <Badge variant="outline">
                    {report.executive_summary.estimated_user_impact}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Persona Summaries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.persona_summaries.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-4 border rounded-md dark:border-border"
                    >
                      <h4 className="font-semibold mb-2">{p.persona}</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {p.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: stats and chart */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Issue Statistics</CardTitle>
              </CardHeader>
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
                          className={"text-black font-bold text-lg w-[35px]"}
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
      )}
    </div>
  );
}
