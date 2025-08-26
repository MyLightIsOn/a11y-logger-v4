"use client";

import React, { useEffect, useMemo, useState } from "react";
import IssueStatisticsChart from "@/components/custom/issue-statistics-chart";
import { issuesApi } from "@/lib/api";
import type { Issue } from "@/types/issue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardIssueStatistics() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchIssues() {
      try {
        setLoading(true);
        setError(null);
        const res = await issuesApi.getIssues({
          sortBy: "created_at",
          sortOrder: "desc",
        });
        if (!active) return;
        if (res.success && res.data) {
          setIssues(res.data.data ?? []);
        } else {
          throw new Error(res.error || "Failed to fetch issues");
        }
      } catch (e) {
        if (!active) return;
        console.error(e);
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchIssues();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const issue of issues) {
      switch (issue.severity) {
        case "1":
          counts.critical += 1;
          break;
        case "2":
          counts.high += 1;
          break;
        case "3":
          counts.medium += 1;
          break;
        default:
          counts.low += 1; // treat "4" or undefined as low
      }
    }
    const total = counts.critical + counts.high + counts.medium + counts.low;
    return { ...counts, total };
  }, [issues]);

  if (loading) {
    return (
      <Card className="flex flex-col min-w-[300px]">
        <CardHeader>
          <CardTitle>Issue Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="flex flex-col min-w-[300px]">
      <CardContent className="flex-1 pb-0">
        <IssueStatisticsChart
          criticalCount={stats.critical}
          highCount={stats.high}
          mediumCount={stats.medium}
          lowCount={stats.low}
          totalCount={stats.total}
        />
      </CardContent>
    </Card>
  );
}
