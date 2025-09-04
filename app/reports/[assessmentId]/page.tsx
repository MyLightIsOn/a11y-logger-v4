"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Report } from "@/lib/validation/report";
import { reportsApi } from "@/lib/api";

export default function ReportDetailsPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const router = useRouter();
  const [report, setReport] = React.useState<Report | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    const load = async () => {
      if (!assessmentId) return;
      setLoading(true);
      setError(undefined);
      try {
        // Prefer sessionStorage (hand-off from generation)
        const key = `report:${assessmentId}`;
        const cached = typeof window !== "undefined" ? window.sessionStorage.getItem(key) : null;
        if (cached) {
          setReport(JSON.parse(cached) as Report);
          setLoading(false);
          return;
        }
        // Fallback: try GET latest (works if persistence is enabled)
        const res = await reportsApi.getLatest(assessmentId);
        if (res.success && res.data) {
          setReport(res.data as Report);
        } else {
          setError(res.error || "Report not found. Try generating a report first.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [assessmentId]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
        <h1 className="text-2xl font-bold">Report Details</h1>
        <div />
      </div>

      {loading && <p>Loading report...</p>}
      {error && (
        <div className="text-red-600">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && report && (
        <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto text-sm">
          {JSON.stringify(report, null, 2)}
        </pre>
      )}
    </div>
  );
}
