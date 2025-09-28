"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { CoreFields } from "@/components/custom/issues/CoreFields";

function IssueForm({ mode = "create" }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: "",
      description: "",
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
        <input type="submit" />
      </form>
    </div>
  );
}

export default IssueForm;
