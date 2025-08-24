"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

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

export const description = "A horizontal bar chart";

const chartData = [
  { wcag: "1.1.1 - Non-Text Content", count: 186 },
  {
    wcag: "1.2.1 - Audio-only and Video-only (Prerecorded)",
    count: 305,
  },
  { wcag: "1.2.2 - Captions (Prerecorded)", count: 237 },
  {
    wcag: "1.2.3 - Audio Description or Media Alternative (Prerecorded)",
    count: 73,
  },
  { wcag: "1.2.4 - Captions (Live)", count: 209 },
  {
    wcag: "1.2.5 - Audio Description (Prerecorded)",
    count: 214,
  },
];

const chartConfig = {
  count: {
    label: "Desktop",
    color: "#8eb0ee",
  },
} satisfies ChartConfig;

export function DashboardBarChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bar Chart - Horizontal</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              left: -20,
            }}
          >
            <XAxis type="number" dataKey="count" />
            <YAxis
              dataKey="wcag"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
              tick={{ fontSize: 17 }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Trending up by 5.2% this wcag <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Showing total visitors for the last 6 wcags
        </div>
      </CardFooter>
    </Card>
  );
}
