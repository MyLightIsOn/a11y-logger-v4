import React, { useState } from "react";
import {
  PieChart,
  Pie,
  ResponsiveContainer,
  Label as ChartLabel,
} from "recharts";
import { ChartPieIcon, TableIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface IssueStatisticsChartProps {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalCount: number;
}

const IssueStatisticsChart: React.FC<IssueStatisticsChartProps> = ({
  criticalCount,
  highCount,
  mediumCount,
  lowCount,
  totalCount,
}) => {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  // Define colors for each severity level
  const COLORS = {
    critical: "#f67e7e", // red
    high: "#f89148", // orange
    medium: "#f3c646", // yellow
    low: "#8eb0ee", // blue
  };

  // Prepare data for the chart
  const data = [
    { name: "Critical", value: criticalCount, fill: COLORS.critical },
    { name: "High", value: highCount, fill: COLORS.high },
    { name: "Medium", value: mediumCount, fill: COLORS.medium },
    { name: "Low", value: lowCount, fill: COLORS.low },
  ].filter((item) => item.value > 0); // Only include non-zero values

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Issue Statistics</h2>
        <div className="flex items-center space-x-2">
          <Label htmlFor="view-mode" className="sr-only">
            View Mode
          </Label>
          <div className="flex items-center space-x-1">
            <TableIcon
              className={cn(
                "h-4 w-4",
                viewMode === "table" ? "text-primary" : "text-muted-foreground",
              )}
            />
            <Switch
              id="view-mode"
              checked={viewMode === "chart"}
              onCheckedChange={(checked) =>
                setViewMode(checked ? "chart" : "table")
              }
            />
            <ChartPieIcon
              className={cn(
                "h-4 w-4",
                viewMode === "chart" ? "text-primary" : "text-muted-foreground",
              )}
            />
          </div>
        </div>
      </div>

      {viewMode === "chart" ? (
        <div className="relative flex-1 flex justify-center">
          {data.length > 0 ? (
            <div className={"flex flex-col items-center w-full"}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    innerRadius={60}
                    strokeWidth={5}
                    stroke="hsl(var(--card))"
                  >
                    <ChartLabel
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-3xl font-bold"
                              >
                                {totalCount}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground"
                              >
                                Total
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-between gap-2 w-full max-w-[300px]">
                <div
                  className="flex flex-col items-center
 rounded-md p-2 space-y-2 w-1/4"
                >
                  <span
                    className={"block w-5 h-5 rounded-full"}
                    style={{ backgroundColor: COLORS.critical }}
                  />
                  <span className="font-medium text-sm">Critical</span>
                  <span className="text-xl font-bold mt-1">
                    {criticalCount}
                  </span>
                </div>
                <div
                  className="flex flex-col items-center
 rounded-md p-2 space-y-2 w-1/4"
                >
                  <span
                    className={"block w-5 h-5 rounded-full"}
                    style={{ backgroundColor: COLORS.high }}
                  />
                  <span className="font-medium text-sm">High</span>
                  <span className="text-xl font-bold mt-1">{highCount}</span>
                </div>
                <div
                  className="flex flex-col items-center
 rounded-md p-2 space-y-2 w-1/4"
                >
                  <span
                    className={"block w-5 h-5 rounded-full"}
                    style={{ backgroundColor: COLORS.medium }}
                  />
                  <span className="font-medium text-sm">Medium</span>
                  <span className="text-xl font-bold mt-1">{mediumCount}</span>
                </div>
                <div
                  className="flex flex-col items-center
 rounded-md p-2 space-y-2 w-1/4"
                >
                  <span
                    className={"block w-5 h-5 rounded-full"}
                    style={{ backgroundColor: COLORS.low }}
                  />
                  <span className="font-medium text-sm">Low</span>
                  <span className="text-xl font-bold mt-1">{lowCount}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              No issues found
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Severity</th>
                <th className="text-right py-2">Count</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 flex items-center">
                  <span
                    className="w-5 h-5 rounded-full mr-2"
                    style={{ backgroundColor: COLORS.critical }}
                  ></span>
                  Critical
                </td>
                <td className="text-right py-2">{criticalCount}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 flex items-center">
                  <span
                    className="w-5 h-5 rounded-full mr-2"
                    style={{ backgroundColor: COLORS.high }}
                  ></span>
                  High
                </td>
                <td className="text-right py-2">{highCount}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 flex items-center">
                  <span
                    className="w-5 h-5 rounded-full mr-2"
                    style={{ backgroundColor: COLORS.medium }}
                  ></span>
                  Medium
                </td>
                <td className="text-right py-2">{mediumCount}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 flex items-center">
                  <span
                    className="w-5 h-5 rounded-full mr-2"
                    style={{ backgroundColor: COLORS.low }}
                  ></span>
                  Low
                </td>
                <td className="text-right py-2">{lowCount}</td>
              </tr>
              <tr className="font-bold">
                <td className="py-2">Total</td>
                <td className="text-right py-2">{totalCount}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default IssueStatisticsChart;
