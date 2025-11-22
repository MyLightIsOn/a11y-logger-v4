"use client";
import { PDFViewer, MyDocument } from "@/app/reports/[assessmentId]/print/pdf";
import { useParams } from "next/navigation";
import { useAssessmentDetails } from "@/lib/query/use-assessment-details-query";
import * as React from "react";
import { reportsApi } from "@/lib/api";

export default function Page() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { assessment, issues, stats } = useAssessmentDetails(assessmentId);

  const [overview, setOverview] = React.useState<string | undefined>(undefined);
  const [topRisks, setTopRisks] = React.useState<string[] | undefined>(
    undefined,
  );
  const [quickWins, setQuickWins] = React.useState<string[] | undefined>(
    undefined,
  );
  const [personaSummaries, setPersonaSummaries] = React.useState<
    { persona: string; summary: string }[] | undefined
  >(undefined);

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      if (!assessmentId) return;
      const res = await reportsApi.getLatest(assessmentId);
      if (!active) return;
      if (res.success && res.data) {
        const r = res.data;
        setOverview(r?.executive_summary?.overview);
        setTopRisks(r?.executive_summary?.top_risks ?? []);
        setQuickWins(r?.executive_summary?.quick_wins ?? []);
        setPersonaSummaries(r?.persona_summaries ?? []);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [assessmentId]);

  // Map issues into lightweight PDFIssue shape
  const pdfIssues = issues.map((iss) => ({
    id: iss.id,
    title: iss.title,
    severity: iss.severity as unknown as string,
    wcag_codes: iss.criteria_codes ?? [],
  }));

  return (
    <PDFViewer className={"h-screen"}>
      <MyDocument
        assessmentId={assessmentId}
        assessmentName={assessment?.name}
        generatedAt={new Date().toISOString()}
        stats={
          stats
            ? {
                critical: stats.critical,
                high: stats.high,
                medium: stats.medium,
                low: stats.low,
                total: stats.total,
              }
            : undefined
        }
        overview={overview}
        topRisks={topRisks}
        quickWins={quickWins}
        personaSummaries={personaSummaries}
        issues={pdfIssues}
      />
    </PDFViewer>
  );
}
