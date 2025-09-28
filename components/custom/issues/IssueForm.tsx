"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { CoreFields } from "@/components/custom/issues/CoreFields";

let renderCount = 0;

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
  renderCount++;
  return (
    <div>
      Issue Form
      <div>{renderCount}</div>
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
