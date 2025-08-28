"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { issuesApi } from "@/lib/api";
import wcagWithPrinciples from "@/data/wcag-criteria.json";

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

export function CriteriaTable() {
  const [principle, setPrinciple] = useState<Principle>("Perceivable");
  const [criteriaSummary, setCriteriaSummary] = useState<Array<{
    code: string;
    count: number;
  }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animateBars, setAnimateBars] = useState(false);

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

  useEffect(() => {
    if (!loading && criteriaSummary) {
      // Small delay to ensure DOM is ready, then trigger animation
      const timer = setTimeout(() => setAnimateBars(true), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, criteriaSummary]);

  const chartData = useMemo(() => {
    if (!criteriaSummary)
      return [] as Array<{
        wcag: string;
        code: string;
        count: number;
        principle: Principle;
      }>;

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
        wcag: meta.name,
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

  const maxCount = useMemo(() => {
    return chartData.reduce((m, r) => Math.max(m, r.count ?? 0), 0);
  }, [chartData]);

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
        {error && (
          <div className="text-sm text-destructive mb-2" role="alert">
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : chartData.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No data to display
          </div>
        ) : (
          <table className="w-full border-collapse border-spacing-y-1">
            <tbody>
              {chartData.map((row) => {
                const { wcag, count, code } = row;
                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                const pctLabel = `${Math.round(pct)}%`;
                return (
                  <tr key={code} className="align-middle border border-border">
                    <td className="py-1 pr-2 pl-5 whitespace-nowrap text-sm text-muted-foreground">
                      {code}
                    </td>
                    <td className="py-1 pr-2 text-sm h-10 p-5">{wcag}</td>
                    <td className="py-1 pr-2 w-[70%]">
                      <div
                        className="h-10 w-full bg-muted rounded-full relative overflow-hidden"
                        role="img"
                        aria-label={`${wcag}: ${pctLabel} of ${principle} max`}
                        title={`${pctLabel} (${count} vs max ${maxCount} in ${principle})`}
                      >
                        <div className="h-full dark:bg-primary bg-button-background/5" />
                        <div className="absolute inset-0 flex items-center">
                          <span
                            className={`leading-none bg-[#8eb0ee] px-1 rounded-full transition-all duration-1000 ease-out h-full relative`}
                            style={{ width: animateBars ? `${pct}%` : "0%" }}
                          >
                            {" "}
                            <span
                              className={
                                "absolute left-1.5 top-1.5 text-lg bg-white rounded-full w-7 text-center text-black"
                              }
                            >
                              {count}
                            </span>
                          </span>
                        </div>
                      </div>
                    </td>
                    {/*<td className="py-1 pl-2 pr-5 text-right tabular-nums">
                      {count}
                    </td>*/}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
