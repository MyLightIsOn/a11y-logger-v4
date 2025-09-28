"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import type { CoreFieldsProps } from "@/types/issues-ui";

export function CoreFields({ register, errors }: CoreFieldsProps) {
  return (
    <>
      <section className="bg-card rounded-lg p-4 border border-border mb-4">
        <label htmlFor="title" className="block text-xl font-bold">
          Title <span className={"text-destructive"}>*</span>
        </label>
        <p id="title-help" className="text-sm text-gray-500 mb-1">
          Provide a short title of the issue.
        </p>
        <Input
          type="text"
          id="title"
          placeholder={"Example: Search button not focusable..."}
          className="mt-1 block w-full"
          required
          aria-invalid={!!errors?.title}
          aria-describedby={`title-help${errors?.title ? " title-error" : ""}`}
          {...register("title", { required: "Title is required" })}
        />
        {errors?.title && (
          <p
            id="title-error"
            className="text-sm mt-2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            {String(errors.title.message)}
          </p>
        )}
        {/*<input
          type="text"text
          placeholder="Title"
          {...register("title", { required: "Title is required" })}
        />
        <p>{errors.title?.message}</p>*/}
      </section>
    </>
  );
}

export default React.memo(CoreFields);
