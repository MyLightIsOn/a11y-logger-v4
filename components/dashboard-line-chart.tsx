"use client";

import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
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
    label: "Desktop",
    color: "#8eb0ee",
  },
  assessments: {
    label: "Mobile",
    color: "#24c840",
  },
  issues: {
    label: "Mobile",
    color: "#9124c8",
  },
} satisfies ChartConfig;

export function DashBoardLineChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Line Chart - Multiple</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
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
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
