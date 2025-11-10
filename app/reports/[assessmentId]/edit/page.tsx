"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, SaveIcon, Loader2, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSaveReport } from "@/lib/query/use-save-report-mutation";
import type { Report } from "@/lib/validation/report";
import { reportsApi } from "@/lib/api";
import ButtonToolbar from "@/app/vpats/[vpatId]/ButtonToolbar";

const MAX_OVERVIEW_CHARS = 1200;
const MAX_PERSONA_CHARS = 800;

type EstimatedImpact = "Critical" | "High" | "Medium" | "Low";

interface FormValues {
  overview: string;
  personaSummaries: { persona: string; summary: string }[];
  topRisks: string[]; // 5 inputs
  quickWins: string[]; // 5 inputs
  estimatedImpact: EstimatedImpact;
}

export default function EditReportPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const router = useRouter();

  const [initialReport, setInitialReport] = React.useState<Report | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    trigger,
  } = useForm<FormValues>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      overview: "",
      personaSummaries: [],
      topRisks: ["", "", "", "", ""],
      quickWins: ["", "", "", "", ""],
      estimatedImpact: "Low",
    },
  });

  const { save, isPending, error: saveError } = useSaveReport(assessmentId, () => {
    // After successful save, redirect back to detail
    router.push(`/reports/${assessmentId}`);
  });

  React.useEffect(() => {
    const load = async () => {
      if (!assessmentId) return;
      setLoading(true);
      setError(null);
      try {
        const key = `report:${assessmentId}`;
        let report: Report | null = null;
        const cached =
          typeof window !== "undefined" ? window.sessionStorage.getItem(key) : null;
        if (cached) {
          report = JSON.parse(cached) as Report;
        } else {
          const res = await reportsApi.getLatest(assessmentId);
          if (res.success && res.data) {
            report = res.data as Report;
          }
        }
        if (!report) {
          setError("No report found to edit. Try generating a report first.");
          setLoading(false);
          return;
        }
        setInitialReport(report);
        // Seed form
        reset({
          overview: report.executive_summary?.overview || "",
          personaSummaries: (report.persona_summaries || []).map((p) => ({
            persona: p.persona,
            summary: p.summary || "",
          })),
          topRisks: Array.from({ length: 5 }, (_, i) => report.executive_summary?.top_risks?.[i] || ""),
          quickWins: Array.from({ length: 5 }, (_, i) => report.executive_summary?.quick_wins?.[i] || ""),
          estimatedImpact: (report.executive_summary?.estimated_user_impact as EstimatedImpact) || "Low",
        });
        // Validate immediately so errors/counters reflect constraints on load
        void trigger();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [assessmentId, reset]);

  const onSubmit = (values: FormValues) => {
    if (!initialReport || !assessmentId) return;

    // Build updated report object preserving other fields
    const updated: Report = {
      ...initialReport,
      executive_summary: {
        ...initialReport.executive_summary,
        overview: values.overview?.trim() || "",
        top_risks: (values.topRisks || []).map((s) => s.trim()).filter(Boolean),
        quick_wins: (values.quickWins || []).map((s) => s.trim()).filter(Boolean),
        estimated_user_impact: values.estimatedImpact,
      },
      persona_summaries: (values.personaSummaries || []).map((p) => ({
        persona: p.persona,
        summary: p.summary?.trim() || "",
      })),
    };

    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(`report:${assessmentId}`, JSON.stringify(updated));
      }
    } catch {}

    save(updated);
  };

  const personaSummaries = watch("personaSummaries");
  const overviewVal = watch("overview") || "";
  const hasErrors = Object.keys(errors || {}).length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <Link
          href={`/reports/${assessmentId}`}
          className="dark:text-white hover:underline flex items-center a11y-focus w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Report Detail
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-4">Edit Report</h1>

      {loading ? (
        <div>Loading report…</div>
      ) : error ? (
        <div className="text-destructive">{error}</div>
      ) : !initialReport ? (
        <div className="text-destructive">Report not found.</div>
      ) : (
        <form id="edit-report-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: form fields */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Executive Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <label className="font-semibold">Overview</label>
                    <textarea
                      className="w-full min-h-[140px] p-2 border rounded bg-background"
                      maxLength={MAX_OVERVIEW_CHARS}
                      aria-describedby="overview-char-count"
                      {...register("overview", {
                        maxLength: {
                          value: MAX_OVERVIEW_CHARS,
                          message: `Overview must be ${MAX_OVERVIEW_CHARS} characters or fewer`,
                        },
                      })}
                    />
                    <div className={`text-xs mt-1 ${overviewVal.length >= MAX_OVERVIEW_CHARS ? "text-destructive" : "text-muted-foreground"}`} id="overview-char-count" aria-live="polite">
                      {overviewVal.length}/{MAX_OVERVIEW_CHARS} characters
                    </div>
                    {errors.overview && (
                      <p className="text-sm text-destructive">{errors.overview.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">Top Risks</h3>
                      <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <input
                            key={idx}
                            type="text"
                            placeholder={`Risk ${idx + 1}`}
                            className="w-full p-2 border rounded bg-background"
                            {...register(`topRisks.${idx}` as const)}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Quick Wins</h3>
                      <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <input
                            key={idx}
                            type="text"
                            placeholder={`Quick Win ${idx + 1}`}
                            className="w-full p-2 border rounded bg-background"
                            {...register(`quickWins.${idx}` as const)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold">Estimated User Impact</label>
                    <select
                      className="w-full p-2 border rounded bg-background"
                      {...register("estimatedImpact")}
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <h2 className="text-xl font-bold mb-2">Persona Summaries</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(personaSummaries && personaSummaries.length
                  ? personaSummaries
                  : initialReport.persona_summaries
                ).map((p, idx) => {
                  const current = (watch(`personaSummaries.${idx}.summary` as const) ?? p.summary ?? "") as string;
                  const over = current.length >= MAX_PERSONA_CHARS;
                  return (
                    <Card key={p.persona}>
                      <CardHeader>
                        <CardTitle>{p.persona}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <textarea
                          className="w-full min-h-[120px] p-2 border rounded bg-background"
                          maxLength={MAX_PERSONA_CHARS}
                          aria-describedby={`persona-${idx}-char-count`}
                          {...register(`personaSummaries.${idx}.summary` as const, {
                            maxLength: {
                              value: MAX_PERSONA_CHARS,
                              message: `Summary must be ${MAX_PERSONA_CHARS} characters or fewer`,
                            },
                          })}
                          defaultValue={p.summary}
                        />
                        <div
                          id={`persona-${idx}-char-count`}
                          className={`text-xs mt-1 ${over ? "text-destructive" : "text-muted-foreground"}`}
                          aria-live="polite"
                        >
                          {current.length}/{MAX_PERSONA_CHARS} characters
                        </div>
                        {errors.personaSummaries?.[idx]?.summary && (
                          <p className="text-sm text-destructive">
                            {errors.personaSummaries[idx]?.summary?.message as string}
                          </p>
                        )}
                        <input
                          type="hidden"
                          {...register(`personaSummaries.${idx}.persona` as const)}
                          defaultValue={p.persona}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Right column intentionally omitted per requirements */}
          </div>

          <div className="mt-6">
            <ButtonToolbar
              buttons={
                <>
                  <Button
                    variant="success"
                    type="submit"
                    form="edit-report-form"
                    disabled={isPending || hasErrors}
                    aria-describedby="submit-status"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <SaveIcon className="h-4 w-4" aria-hidden="true" />
                    )}
                    {isPending ? "Saving Report..." : "Save Report"}
                  </Button>
                  <span id="submit-status" role="status" aria-live="polite" className="sr-only">
                    {isPending ? "Saving Report" : ""}
                  </span>
                  <Button
                    variant="destructive"
                    type="button"
                    onClick={() => router.push(`/reports/${assessmentId}`)}
                    aria-label="Cancel"
                  >
                    <XIcon /> Cancel
                  </Button>
                </>
              }
            />
            {saveError && (
              <div className="mt-2 text-destructive">{saveError.message}</div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
