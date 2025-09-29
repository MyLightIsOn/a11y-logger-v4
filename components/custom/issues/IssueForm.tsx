"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { CoreFields } from "@/components/custom/issues/CoreFields";
import { SubmitButton } from "@/components/custom/forms/submit-button";

function IssueForm({ mode = "create" }) {
  const {
    register,
    handleSubmit,
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
      severity: "Select severity",
    },
  });

  return (
    <div>
      <h2 className={"font-bold text-xl mb-4"}>
        {mode === "create" ? "Create New Issue" : "Edit Issue"}
      </h2>
      <form
        id={mode === "create" ? "create-issue-form" : "edit-issue-form"}
        onSubmit={handleSubmit((data) => {
          console.log(data);
        })}
      >
        <CoreFields register={register} errors={errors} />
        <div className="flex justify-end mt-4">
          <SubmitButton text={"Submit"} loadingText={"Saving..."} />
        </div>
      </form>
    </div>
  );
}

export default IssueForm;
