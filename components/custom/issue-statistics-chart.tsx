"use client";

import React from "react";

export interface IssueStatisticsChartProps {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalCount: number;
}

/**
 * IssueStatisticsChart
 * A lightweight, styled summary of issue counts by severity used in sidebars.
 * Styling mirrors the old-assessment reference: card container with rows and
 * colored indicators matching severity badge colors used across the app.
 */
export default function IssueStatisticsChart({
  criticalCount,
  highCount,
  mediumCount,
  lowCount,
  totalCount,
}: IssueStatisticsChartProps) {
  const items = [
    { label: "Critical", count: criticalCount, color: "bg-red-400", bar: "bg-red-200" },
    { label: "High", count: highCount, color: "bg-orange-400", bar: "bg-orange-200" },
    { label: "Medium", count: mediumCount, color: "bg-yellow-400", bar: "bg-yellow-200" },
    { label: "Low", count: lowCount, color: "bg-blue-400", bar: "bg-blue-200" },
  ];

  const safeTotal = Math.max(0, totalCount || 0);

  return (
    <section className="bg-card rounded-lg p-4 border border-border">
      <h2 className="text-lg font-semibold mb-3">Issue Statistics</h2>
      <div className="space-y-3">
        {items.map((item) => {
          const pct = safeTotal > 0 ? Math.round((item.count / safeTotal) * 100) : 0;
          return (
            <div key={item.label} className="w-full">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`block w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-sm font-medium">{item.label.toUpperCase()}</span>
                </div>
                <div className="text-sm tabular-nums">{item.count}</div>
              </div>
              <div className="w-full h-2 bg-muted rounded">
                <div
                  className={`h-2 rounded ${item.bar}`}
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-right text-sm text-muted-foreground">
        Total: <span className="tabular-nums">{safeTotal}</span>
      </div>
    </section>
  );
}
