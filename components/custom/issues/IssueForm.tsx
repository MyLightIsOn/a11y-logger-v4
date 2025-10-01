"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { CoreFields } from "@/components/custom/issues/CoreFields";
import { SubmitButton } from "@/components/custom/forms/submit-button";
import IssueFormAssessments from "@/components/custom/issues/IssueFormAssessments";
import AIAssistPanel from "@/components/custom/issues/AIAssistPanel";
import { WcagCriteriaSection } from "@/components/custom/issues/WcagCriteriaSection";

import { useWcagCriteriaQuery } from "@/lib/query/use-wcag-criteria-query";
import { useAssessmentsQuery } from "@/lib/query/use-assessments-query";
import type { WcagVersion } from "@/types/issue";

function IssueForm({ mode = "create" }) {
  const [aiBusy, setAiBusy] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: "",
      description: "",
      impact: "",
      url: "",
      selector: "",
      code_snippet: "",
      suggested_fix: "",
      severity: undefined,
      assessment_id: undefined,
      ai_assist: "",
    },
  });

  // Load assessments to resolve the selected assessment's WCAG version for AI context
  const { data: assessments = [] } = useAssessmentsQuery();

  // Load full criteria catalog and filter by the assessment's version
  const {
    data: allCriteria = [],
    isLoading: wcagLoading,
    error: wcagError,
  } = useWcagCriteriaQuery();

  const selectedAssessment = watch("assessment_id");

  // Derive assessment context for WCAG filtering
  const assessmentObj = assessments.find((a) => a.id === selectedAssessment);
  const effectiveWcagVersion = assessmentObj?.wcag_version as
    | WcagVersion
    | undefined;

  return (
    <div>
      <h2 className={"font-bold text-xl mb-4"}>
        {mode === "create" ? "Create New Issue" : "Edit Issue"}
      </h2>
      <IssueFormAssessments register={register} assessments={assessments} />

      {selectedAssessment && (
        <AIAssistPanel
          register={register}
          aiBusy={aiBusy}
          setAiBusy={setAiBusy}
        />
      )}

      {selectedAssessment && (
        <form
          id={mode === "create" ? "create-issue-form" : "edit-issue-form"}
          onSubmit={handleSubmit((data) => {
            console.log(data);
          })}
        >
          <CoreFields register={register} errors={errors} />
          <WcagCriteriaSection
            isLoading={wcagLoading}
            error={wcagError as Error | undefined}
            allCriteria={allCriteria}
            disabled={!effectiveWcagVersion}
            version={effectiveWcagVersion ?? null}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />

          <div className="flex justify-end mt-4">
            <SubmitButton text={"Submit"} loadingText={"Saving..."} />
          </div>
        </form>
      )}
    </div>
  );
}

export default IssueForm;
