"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, SaveIcon, Loader2, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { useSaveReport } from "@/lib/query/use-save-report-mutation";
import { useGenerateReport } from "@/lib/query/use-generate-report-mutation";
import type { Report, Persona } from "@/lib/validation/report";
import { PERSONAS } from "@/lib/validation/report";
import type { Issue } from "@/types/issue";
import { useAssessmentDetails } from "@/lib/query/use-assessment-details-query";
import ButtonToolbar from "@/app/vpats/[vpatId]/ButtonToolbar";
import AiIcon from "@/components/custom/AiIcon";

const MAX_OVERVIEW_CHARS = 1200;
const MAX_PERSONA_CHARS = 800;

type EstimatedImpact = "Critical" | "High" | "Medium" | "Low";

interface FormValues {
  overview: string;
  personaSummaries: { persona: Persona; summary: string }[];
  topRisks: string[]; // 5 inputs
  quickWins: string[]; // 5 inputs
  estimatedImpact: EstimatedImpact;
}

export default function CreateReportPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    setValue,
    getValues,
  } = useForm<FormValues>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      overview: "",
      // Always show Persona Summaries: pre-seed with all personas and empty summaries
      personaSummaries: (PERSONAS as Persona[]).map((p) => ({
        persona: p,
        summary: "",
      })),
      topRisks: ["", "", "", "", ""],
      quickWins: ["", "", "", "", ""],
      estimatedImpact: "Low",
    },
  });

  const {
    save,
    isPending,
    error: saveError,
  } = useSaveReport(assessmentId, () => {
    router.push(`/reports/${assessmentId}`);
  });

  // Generate report button (fills only blank fields)
  const {
    generate,
    isPending: isGenerating,
    error: generateError,
  } = useGenerateReport(assessmentId, (generated) => {
    const current = getValues();

    // Overview
    const genOverview = generated.executive_summary?.overview || "";
    const curOverview = (current.overview || "").trim();
    if (!curOverview && genOverview) {
      setValue("overview", genOverview, {
        shouldDirty: true,
        shouldTouch: true,
      });
    }

    // Top Risks (5 slots)
    const genTop = generated.executive_summary?.top_risks || [];
    const curTop = current.topRisks || ["", "", "", "", ""];
    const mergedTop = curTop.map((val, i) =>
      val?.trim() ? val : genTop[i] || "",
    );
    setValue("topRisks", mergedTop, { shouldDirty: true, shouldTouch: true });

    // Quick Wins (5 slots)
    const genWins = generated.executive_summary?.quick_wins || [];
    const curWins = current.quickWins || ["", "", "", "", ""];
    const mergedWins = curWins.map((val, i) =>
      val?.trim() ? val : genWins[i] || "",
    );
    setValue("quickWins", mergedWins, { shouldDirty: true, shouldTouch: true });

    // Persona summaries — if none in the form, seed from generated; otherwise merge blanks only
    const curPersonas = current.personaSummaries || [];
    if (curPersonas.length === 0) {
      const fromGen = (generated.persona_summaries || []).map((p) => ({
        persona: p.persona,
        summary: p.summary || "",
      }));
      if (fromGen.length > 0) {
        setValue("personaSummaries", fromGen, {
          shouldDirty: true,
          shouldTouch: true,
        });
      }
    } else {
      const genPersonaMap = new Map(
        (generated.persona_summaries || []).map((p) => [
          p.persona,
          p.summary || "",
        ]),
      );
      const mergedPersonaSummaries = curPersonas.map((p) => ({
        persona: p.persona,
        summary: (p.summary || "").trim()
          ? p.summary
          : genPersonaMap.get(p.persona) || p.summary || "",
      }));
      setValue("personaSummaries", mergedPersonaSummaries, {
        shouldDirty: true,
        shouldTouch: true,
      });
    }

    // Re-validate so counters/errors update
    void trigger();
  });

  // Load assessment issues for review on the create screen
  const { issues } = useAssessmentDetails(assessmentId);

  const [selectedIssue, setSelectedIssue] = React.useState<Issue | null>(null);

  const issueColumns: DataTableColumn<Issue>[] = React.useMemo(
    () => [
      {
        header: "Title",
        accessorKey: "title",
        sortable: true,
        cell: (issue) => (
          <button
            type="button"
            className="font-bold hover:underline text-left"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedIssue(issue);
            }}
            aria-label={`Open issue ${issue.title}`}
          >
            {issue.title}
          </button>
        ),
      },
      {
        header: "Severity",
        accessorKey: "severity",
        sortable: true,
        cell: (issue) => (
          <Badge
            variant="outline"
            className={`text-black p-1 px-2 ${
              issue.severity === "1"
                ? "bg-red-100 border-red-800"
                : issue.severity === "2"
                  ? "bg-orange-100 border-orange-800"
                  : issue.severity === "3"
                    ? "bg-yellow-100 border-yellow-800"
                    : "bg-blue-100 border-blue-800"
            }`}
          >
            {issue.severity === "1" ? (
              <p className="flex items-center text-xs">
                CRITICAL
                <span className="block w-3 h-3 rounded-full bg-red-400 ml-2" />
              </p>
            ) : issue.severity === "2" ? (
              <p className="flex items-center text-xs">
                HIGH
                <span className="block w-3 h-3  rounded-full bg-orange-400 ml-2" />
              </p>
            ) : issue.severity === "3" ? (
              <p className="flex items-center text-xs">
                MEDIUM
                <span className="block w-3 h-3 rounded-full bg-yellow-400 ml-2" />
              </p>
            ) : (
              <p className="flex items-center text-xs">
                LOW
                <span className="block w-3 h-3 rounded-full bg-blue-400 ml-2" />
              </p>
            )}
          </Badge>
        ),
      },
    ],
    [],
  );

  const onSubmit = (values: FormValues) => {
    if (!assessmentId) return;

    const report: Report = {
      assessment_id: assessmentId,
      executive_summary: {
        overview: values.overview?.trim() || "",
        top_risks: (values.topRisks || []).map((s) => s.trim()).filter(Boolean),
        quick_wins: (values.quickWins || [])
          .map((s) => s.trim())
          .filter(Boolean),
        estimated_user_impact: values.estimatedImpact,
      },
      persona_summaries: (values.personaSummaries || []).map((p) => ({
        persona: p.persona,
        summary: p.summary?.trim() || "",
      })),
    };

    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          `report:${assessmentId}`,
          JSON.stringify(report),
        );
      }
    } catch {}

    save(report);
  };

  const personaSummaries = watch("personaSummaries");
  const overviewVal = watch("overview") || "";
  const hasErrors = Object.keys(errors || {}).length > 0;

  return (
    <div className="container px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            router.back();
          }}
          className="dark:text-white hover:underline flex items-center a11y-focus w-fit"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </a>
      </div>

      <div className={"flex justify-between items-center mb-4"}>
        <h1 className="text-2xl font-bold mb-4">Create Report</h1>
        <ButtonToolbar
          buttons={
            <>
              <Button
                type="button"
                onClick={() => generate()}
                disabled={isGenerating}
                aria-describedby="generate-status"
              >
                {isGenerating ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <AiIcon />
                )}
                {isGenerating ? "Generating…" : "Generate Report"}
              </Button>
              <span
                id="generate-status"
                role="status"
                aria-live="polite"
                className="sr-only"
              >
                {isGenerating ? "Generating report" : ""}
              </span>
            </>
          }
        />
      </div>
      {generateError && (
        <div className="mt-2 text-destructive">{generateError.message}</div>
      )}

      <form id="create-report-form" onSubmit={handleSubmit(onSubmit)}>
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
                  <div
                    className={`text-xs mt-1 ${overviewVal.length >= MAX_OVERVIEW_CHARS ? "text-destructive" : "text-muted-foreground"}`}
                    id="overview-char-count"
                    aria-live="polite"
                  >
                    {overviewVal.length}/{MAX_OVERVIEW_CHARS} characters
                  </div>
                  {errors.overview && (
                    <p className="text-sm text-destructive">
                      {errors.overview.message}
                    </p>
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
              {(personaSummaries || []).map((p, idx) => {
                const current = (watch(
                  `personaSummaries.${idx}.summary` as const,
                ) ??
                  p.summary ??
                  "") as string;
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
                        {...register(
                          `personaSummaries.${idx}.summary` as const,
                          {
                            maxLength: {
                              value: MAX_PERSONA_CHARS,
                              message: `Summary must be ${MAX_PERSONA_CHARS} characters or fewer`,
                            },
                          },
                        )}
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
                          {
                            errors.personaSummaries[idx]?.summary
                              ?.message as string
                          }
                        </p>
                      )}
                      <input
                        type="hidden"
                        {...register(
                          `personaSummaries.${idx}.persona` as const,
                        )}
                        defaultValue={p.persona}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Right column: Issues list and inline detail for easy review while creating */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Issues</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedIssue ? (
                  <div
                    className="space-y-3"
                    role="region"
                    aria-label="Issue detail"
                  >
                    <button
                      type="button"
                      className="text-sm underline text-primary hover:opacity-80"
                      onClick={() => setSelectedIssue(null)}
                      aria-label="Back to issues list"
                    >
                      ← Back to list
                    </button>
                    <h3 className="text-lg font-semibold">
                      {selectedIssue.title}
                    </h3>
                    <Badge
                      variant="outline"
                      className={`text-black p-1 px-2 ${
                        selectedIssue.severity === "1"
                          ? "bg-red-100 border-red-800"
                          : selectedIssue.severity === "2"
                            ? "bg-orange-100 border-orange-800"
                            : selectedIssue.severity === "3"
                              ? "bg-yellow-100 border-yellow-800"
                              : "bg-blue-100 border-blue-800"
                      }`}
                    >
                      {selectedIssue.severity === "1" ? (
                        <p className="flex items-center text-xs">
                          CRITICAL
                          <span className="block w-3 h-3 rounded-full bg-red-400 ml-2" />
                        </p>
                      ) : selectedIssue.severity === "2" ? (
                        <p className="flex items-center text-xs">
                          HIGH
                          <span className="block w-3 h-3  rounded-full bg-orange-400 ml-2" />
                        </p>
                      ) : selectedIssue.severity === "3" ? (
                        <p className="flex items-center text-xs">
                          MEDIUM
                          <span className="block w-3 h-3 rounded-full bg-yellow-400 ml-2" />
                        </p>
                      ) : (
                        <p className="flex items-center text-xs">
                          LOW
                          <span className="block w-3 h-3 rounded-full bg-blue-400 ml-2" />
                        </p>
                      )}
                    </Badge>
                    {selectedIssue.description && (
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {selectedIssue.description}
                      </p>
                    )}
                    {(() => {
                      const codes =
                        (selectedIssue as Issue & { criteria_codes?: string[] })
                          .criteria_codes || [];
                      if (codes.length === 0) return null;
                      return (
                        <div>
                          <p className="text-sm font-semibold mb-1">
                            WCAG Criteria
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {codes.map((code, idx) => (
                              <Badge
                                key={code + "-" + idx}
                                variant="outline"
                                className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full"
                              >
                                {code}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="pt-2">
                      <Link
                        href={`/issues/${selectedIssue.id}`}
                        className="underline text-sm"
                        target={"_blank"}
                        rel={"noopener noreferrer"}
                      >
                        Open full issue
                      </Link>
                    </div>
                  </div>
                ) : issues && issues.length > 0 ? (
                  <DataTable<Issue>
                    data={issues}
                    columns={issueColumns}
                    onRowClick={(i) => setSelectedIssue(i)}
                    data-testid="report-create-issues-table"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No issues in this assessment.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-6">
          <ButtonToolbar
            buttons={
              <>
                <Button
                  variant="success"
                  type="submit"
                  form="create-report-form"
                  disabled={isPending || hasErrors}
                  aria-describedby="submit-status"
                >
                  {isPending ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <SaveIcon className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isPending ? "Saving Report..." : "Save Report"}
                </Button>
                <span
                  id="submit-status"
                  role="status"
                  aria-live="polite"
                  className="sr-only"
                >
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
    </div>
  );
}
