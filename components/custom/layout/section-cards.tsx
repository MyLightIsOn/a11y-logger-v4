"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { projectsApi, assessmentsApi, issuesApi } from "@/lib/api";

export function SectionCards() {
  const [projectsCount, setProjectsCount] = useState<number | null>(null);
  const [assessmentsCount, setAssessmentsCount] = useState<number | null>(null);
  const [issuesCount, setIssuesCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadCounts() {
      try {
        const [projects, assessments, issues] = await Promise.all([
          projectsApi.getProjects({ sortBy: "created_at", sortOrder: "desc" }),
          assessmentsApi.getAssessments({
            sortBy: "created_at",
            sortOrder: "desc",
          }),
          issuesApi.getIssues({ sortBy: "created_at", sortOrder: "desc" }),
        ]);
        if (!isMounted) return;
        setProjectsCount(projects.success ? (projects.data?.count ?? 0) : null);
        setAssessmentsCount(
          assessments.success ? (assessments.data?.count ?? 0) : null,
        );
        setIssuesCount(issues.success ? (issues.data?.count ?? 0) : null);
      } catch {
        if (!isMounted) return;
        setProjectsCount(null);
        setAssessmentsCount(null);
        setIssuesCount(null);
      }
    }
    loadCounts();
    return () => {
      isMounted = false;
    };
  }, []);

  const format = useMemo(() => new Intl.NumberFormat(undefined), []);
  const display = (val: number | null) =>
    typeof val === "number" ? format.format(val) : "—";

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-3 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
      <Card className="@container/card">
        <CardHeader className={"pb-0"}>
          <CardDescription>Total Projects</CardDescription>
          <CardTitle className="text-4xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {display(projectsCount)}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader className={"pb-0"}>
          <CardDescription>Total Assessments</CardDescription>
          <CardTitle className="text-4xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {display(assessmentsCount)}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader className={"pb-0"}>
          <CardDescription>Total Issues</CardDescription>
          <CardTitle className="text-4xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {display(issuesCount)}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
