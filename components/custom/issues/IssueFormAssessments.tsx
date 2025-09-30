import React from "react";
import { Assessment } from "@/types/assessment";
import type { UseFormRegister } from "react-hook-form";
import type { CreateIssueInput } from "@/lib/validation/issues";

type Props = {
  register: UseFormRegister<CreateIssueInput>;
  assessments?: Assessment[] | null;
};

function IssueFormAssessments({ register, assessments }: Props) {
  return (
    <section className="bg-card rounded-lg p-4 border border-border mb-4">
      <label className="block text-xl font-bold">Assessment</label>
      <p id="assessment-help" className="text-sm text-gray-500 mb-1">
        Select an assessment to add this issue to.
      </p>
      <div
        className={
          "mb-8 bg-card border-border border rounded-sm px-4 py-2 text-lg w-fit"
        }
      >
        <select
          className={"bg-transparent w-full rounded-md"}
          {...register("assessment_id")}
        >
          <option value="">Select an assessment</option>
          {assessments &&
            assessments.map((assessment: Assessment) => (
              <option key={assessment.id} value={assessment.id}>
                {assessment.name} - WCAG version: {assessment.wcag_version}
              </option>
            ))}
        </select>
      </div>
    </section>
  );
}

export default IssueFormAssessments;
