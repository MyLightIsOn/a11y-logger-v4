"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { issuesApi } from "@/lib/api";
import wcagWithPrinciples from "@/data/wcag-criteria.json";

export const description = "WCAG criteria distribution by principle";

// Principle keys
const PRINCIPLES = [
  "Perceivable",
  "Operable",
  "Understandable",
  "Robust",
] as const;

type Principle = (typeof PRINCIPLES)[number];

// Build a quick map: code -> { name, principle }
const wcagMap: Record<string, { name: string; principle: Principle }> =
  Object.fromEntries(
    (
      wcagWithPrinciples as Array<{
        code: string;
        name: string;
        principle: Principle;
      }>
    ).map((c) => [c.code, { name: c.name, principle: c.principle }]),
  );

const chartConfig = {
  count: {
    label: "Issues",
    color: "#8eb0ee",
  },
} satisfies ChartConfig;

export function DashboardBarChart() {
  const [principle, setPrinciple] = useState<Principle>("Perceivable");
  const [criteriaSummary, setCriteriaSummary] = useState<Array<{
    code: string;
    count: number;
  }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchCriteriaSummary() {
      try {
        setLoading(true);
        setError(null);

        const response = await issuesApi.getCriteriaSummary();
        if (!active) return;

        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to fetch criteria summary");
        }
        console.log(response.data.data);
        setCriteriaSummary(response.data.data);
      } catch (e) {
        if (!active) return;
        console.error(e);
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchCriteriaSummary();
    return () => {
      active = false;
    };
  }, []);

  const chartData = useMemo(() => {
    if (!criteriaSummary) return [] as Array<{ wcag: string; count: number }>;

    // Convert to array with names and filter by selected principle
    const rows: Array<{ wcag: string; count: number; principle: Principle }> =
      [];

    for (const { code, count } of criteriaSummary) {
      const meta = wcagMap[code];
      if (!meta) continue; // skip unknown codes

      rows.push({
        wcag: `${code} - ${meta.name}`,
        count,
        principle: meta.principle,
      });
    }

    return rows
      .filter((r) => r.principle === principle)
      .sort((a, b) => b.count - a.count);
  }, [criteriaSummary, principle]);

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>WCAG Criteria</CardTitle>
            <CardDescription>Filtered by principle</CardDescription>
          </div>
          <ToggleGroup
            type="single"
            value={principle}
            onValueChange={(v) => v && setPrinciple(v as Principle)}
            variant="outline"
            className="h-9"
          >
            {PRINCIPLES.map((p) => (
              <ToggleGroupItem key={p} value={p} aria-label={p}>
                {p}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 4, right: 12 }}
          >
            <CartesianGrid />
            <XAxis type="number" dataKey="count" />
            <YAxis
              dataKey="wcag"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                typeof value === "string" ? value.slice(0, 6) : value
              }
              tick={{ fontSize: 14 }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={5} />
          </BarChart>
        </ChartContainer>
        {loading && (
          <div className="text-sm text-muted-foreground mt-2">Loading…</div>
        )}
        {error && <div className="text-sm text-destructive mt-2">{error}</div>}
      </CardContent>
    </Card>
  );
}
