"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { assessmentsApi, issuesApi, projectsApi } from "@/lib/api";
import type { Assessment } from "@/types/assessment";
import type { Project } from "@/types/project";
import type { Issue } from "@/types/issue";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChartPieIcon, TableIcon } from "lucide-react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

// Match the metrics shown by the line chart

type RangeKey = "6 months" | "3 months" | "1 month" | "1 week";

const chartConfig = {
  projects: {
    label: "Projects",
    color: "#2ad5d5",
  },
  assessments: {
    label: "Assessments",
    color: "#83c58c",
  },
  issues: {
    label: "Issues",
    color: "#847fdc",
  },
} satisfies ChartConfig;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function addMonths(d: Date, months: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function formatLabel(date: Date, range: RangeKey) {
  if (range === "6 months" || range === "3 months") {
    return date.toLocaleString(undefined, { month: "short" });
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function humanRangeText(range: RangeKey) {
  const now = new Date();
  const end = now;
  let start: Date;
  switch (range) {
    case "6 months":
      start = addMonths(startOfMonth(now), -5);
      break;
    case "3 months":
      start = addMonths(startOfMonth(now), -2);
      break;
    case "1 month":
      start = addDays(startOfDay(now), -29);
      break;
    case "1 week":
    default:
      start = addDays(startOfDay(now), -6);
  }
  const fmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: start.getFullYear() !== end.getFullYear() ? "numeric" : undefined,
  });
  return `${fmt.format(start)} - ${fmt.format(end)}`;
}

export default function DashboardAreaChart() {
  const [range, setRange] = useState<RangeKey>("1 month");
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [assessments, setAssessments] = useState<Assessment[] | null>(null);
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  useEffect(() => {
    let active = true;
    async function fetchAll() {
      try {
        setLoading(true);
        setError(null);
        const [pRes, aRes, iRes] = await Promise.all([
          projectsApi.getProjects({ sortBy: "created_at", sortOrder: "desc" }),
          assessmentsApi.getAssessments({
            sortBy: "created_at",
            sortOrder: "desc",
          }),
          issuesApi.getIssues({ sortBy: "created_at", sortOrder: "desc" }),
        ]);
        if (!active) return;
        if (
          pRes.success &&
          pRes.data &&
          aRes.success &&
          aRes.data &&
          iRes.success &&
          iRes.data
        ) {
          setProjects(pRes.data.data ?? []);
          setAssessments(aRes.data.data ?? []);
          setIssues(iRes.data.data ?? []);
        } else {
          throw new Error(
            pRes.error || aRes.error || iRes.error || "Failed to fetch data",
          );
        }
      } catch (e) {
        if (!active) return;
        console.error(e);
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchAll();
    return () => {
      active = false;
    };
  }, []);

  const chartData = useMemo(() => {
    if (!projects || !assessments || !issues)
      return [] as Array<{
        label: string;
        projects: number;
        assessments: number;
        issues: number;
        date: Date;
      }>;

    const now = new Date();

    if (range === "6 months" || range === "3 months") {
      const months = range === "6 months" ? 6 : 3;
      const monthStarts: Date[] = [];
      const start = addMonths(startOfMonth(now), -(months - 1));
      for (let i = 0; i < months; i++) {
        monthStarts.push(addMonths(start, i));
      }

      const data = monthStarts.map((mStart) => {
        const label = formatLabel(mStart, range);
        const p = projects.filter((p) =>
          isSameMonth(new Date(p.created_at), mStart),
        ).length;
        const a = assessments.filter((a) =>
          isSameMonth(new Date(a.created_at), mStart),
        ).length;
        const i = issues.filter((it) =>
          isSameMonth(new Date(it.created_at), mStart),
        ).length;
        return { label, projects: p, assessments: a, issues: i, date: mStart };
      });
      return data;
    }

    const days = range === "1 month" ? 30 : 7;
    const start = addDays(startOfDay(now), -(days - 1));
    const dates: Date[] = [];
    for (let i = 0; i < days; i++) {
      dates.push(addDays(start, i));
    }

    const data = dates.map((d) => {
      const label = formatLabel(d, range);
      const p = projects.filter((p) =>
        isSameDay(startOfDay(new Date(p.created_at)), d),
      ).length;
      const a = assessments.filter((a) =>
        isSameDay(startOfDay(new Date(a.created_at)), d),
      ).length;
      const i = issues.filter((it) =>
        isSameDay(startOfDay(new Date(it.created_at)), d),
      ).length;
      return { label, projects: p, assessments: a, issues: i, date: d };
    });

    return data;
  }, [projects, assessments, issues, range]);

  const rangeText = useMemo(() => humanRangeText(range), [range]);

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Projects, Assessments, and Issues</CardTitle>
            <CardDescription>{rangeText}</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <ToggleGroup
              type="single"
              value={range}
              onValueChange={(v) => v && setRange(v as RangeKey)}
              variant="outline"
              className="h-9"
            >
              <ToggleGroupItem value="6 months" aria-label="Last 6 months">
                6 months
              </ToggleGroupItem>
              <ToggleGroupItem value="3 months" aria-label="Last 3 months">
                3 months
              </ToggleGroupItem>
              <ToggleGroupItem value="1 month" aria-label="Last 1 month">
                1 month
              </ToggleGroupItem>
              <ToggleGroupItem value="1 week" aria-label="Last 1 week">
                1 week
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        <div
          className="flex items-center space-x-2 absolute -z-10 right-4 top-4"
          tabIndex={-1}
        >
          <Label htmlFor="view-mode" className="sr-only">
            View Mode
          </Label>
          <div className="flex items-center space-x-1">
            <TableIcon
              className={`h-4 w-4 ${viewMode === "table" ? "text-primary" : "text-muted-foreground"}`}
            />
            <Switch
              id="view-mode"
              checked={viewMode === "chart"}
              onCheckedChange={(checked) =>
                setViewMode(checked ? "chart" : "table")
              }
            />
            <ChartPieIcon
              className={`h-4 w-4 ${viewMode === "chart" ? "text-primary" : "text-muted-foreground"}`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!loading && viewMode === "chart" && (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value: string) => value}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={32}
                domain={[0, "dataMax + 1"]}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <defs>
                <linearGradient id="fillProjects" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-projects)"
                    stopOpacity={0.7}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-projects)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
                <linearGradient
                  id="fillAssessments"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--color-assessments)"
                    stopOpacity={0.7}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-assessments)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
                <linearGradient id="fillIssues" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="50%"
                    stopColor="var(--color-issues)"
                    stopOpacity={1}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-issues)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <Area
                dataKey="projects"
                type="linear"
                fill="url(#fillProjects)"
                stroke="var(--color-projects)"
                name="Projects"
                strokeWidth={2}
                dot
                isAnimationActive
              />
              <Area
                dataKey="assessments"
                type="linear"
                fill="url(#fillAssessments)"
                stroke="var(--color-assessments)"
                name="Assessments"
                strokeWidth={2}
                dot
                isAnimationActive
              />
              <Area
                dataKey="issues"
                type="linear"
                fill="url(#fillIssues)"
                stroke="var(--color-issues)"
                name="Issues"
                strokeWidth={2}
                dot
                isAnimationActive
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
        {!loading && viewMode === "table" && (
          <div className="w-full overflow-x-auto h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                  <TableHead className="text-right">Assessments</TableHead>
                  <TableHead className="text-right">Issues</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      No data for selected range.
                    </TableCell>
                  </TableRow>
                ) : (
                  chartData.map((row) => {
                    const total = row.projects + row.assessments + row.issues;
                    return (
                      <TableRow key={`${row.label}-${row.date.toString()}`}>
                        <TableCell className="font-medium">
                          {row.label}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.projects}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.assessments}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.issues}
                        </TableCell>
                        <TableCell className="text-right">{total}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
        {loading && (
          <div className="w-full h-72 flex items-center justify-center">
            <div className="loader"></div>
          </div>
        )}
        {error && <div className="text-sm text-destructive mt-2">{error}</div>}
      </CardContent>
    </Card>
  );
}
