"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";

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

// Principle keys (centralized)
import { PRINCIPLES } from "@/types/report";

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
    const rows: Array<{
      wcag: string;
      code: string;
      count: number;
      principle: Principle;
    }> = [];

    for (const { code, count } of criteriaSummary) {
      const meta = wcagMap[code];
      if (!meta) continue; // skip unknown codes

      rows.push({
        wcag: `${code} - ${meta.name}`,
        code,
        count,
        principle: meta.principle,
      });
    }

    // Sort rows by principle order first, then by WCAG code (numeric segments), not by count
    const principleOrder = new Map(PRINCIPLES.map((p, i) => [p, i] as const));
    const compareCodes = (a: string, b: string) => {
      const as = a.split(".").map((n) => parseInt(n, 10));
      const bs = b.split(".").map((n) => parseInt(n, 10));
      const len = Math.max(as.length, bs.length);
      for (let i = 0; i < len; i++) {
        const ai = as[i] ?? 0;
        const bi = bs[i] ?? 0;
        if (ai !== bi) return ai - bi;
      }
      return 0;
    };

    return rows
      .filter((r) => r.principle === principle)
      .sort((a, b) => {
        const pa = principleOrder.get(a.principle) ?? 0;
        const pb = principleOrder.get(b.principle) ?? 0;
        if (pa !== pb) return pa - pb;
        return compareCodes(a.code, b.code);
      });
  }, [criteriaSummary, principle]);

  console.log(chartData);
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
        <ChartContainer config={chartConfig} className="min-h-[1000px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 4, right: 12 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="count" />
            <YAxis
              dataKey="wcag"
              type="category"
              interval={0}
              textAnchor="end" // Align the text to the end of the tick
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                typeof value === "string" ? value.slice(0, 6) : value
              }
              tick={{ fontSize: 16 }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />

            <Bar dataKey="count" fill="var(--color-count)" radius={5}>
              <LabelList
                dataKey="count"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={14}
              />
            </Bar>
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
