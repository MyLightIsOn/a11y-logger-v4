"use client";

import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

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

export const description = "A multiple line chart";

const chartData = [
  { month: "January", projects: 1, assessments: 1, issues: 20 },
  { month: "February", projects: 0, assessments: 5, issues: 10 },
  { month: "March", projects: 0, assessments: 2, issues: 19 },
  { month: "April", projects: 2, assessments: 0, issues: 6 },
  { month: "May", projects: 0, assessments: 0, issues: 12 },
  { month: "June", projects: 0, assessments: 7, issues: 7 },
];

const chartConfig = {
  projects: {
    label: "Projects",
    color: "#6762bf",
  },
  assessments: {
    label: "Assessments",
    color: "#90b1ee",
  },
  issues: {
    label: "Issues",
    color: "#f67e7e",
  },
} satisfies ChartConfig;

export function DashBoardLineChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects, Assessments, and Issues</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="projects"
              type="linear"
              stroke="var(--color-projects)"
              strokeWidth={5}
              dot
            />
            <Line
              dataKey="assessments"
              type="linear"
              stroke="var(--color-assessments)"
              strokeWidth={5}
              dot
            />
            <Line
              dataKey="issues"
              type="linear"
              stroke="var(--color-issues)"
              strokeWidth={5}
              dot
            />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
