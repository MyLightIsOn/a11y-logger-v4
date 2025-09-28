"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { CreateIssueInput } from "@/lib/validation/issues";
import { issueFormConfig } from "@/lib/issues/issue-form-config";

type Props = {
  errors: FieldErrors<CreateIssueInput>;
  register: UseFormRegister<CreateIssueInput>;
};

export function CoreFields({ register, errors }: Props) {
  return (
    <>
      <section className="bg-card rounded-lg p-4 border border-border mb-4">
        {issueFormConfig.map((config) => {
          const field = config.field as keyof CreateIssueInput;
          return (
            <section key={config.field}>
              <label htmlFor={config.field} className="block text-xl font-bold">
                {config.label}
                {config.required && (
                  <span className={"text-destructive"}>*</span>
                )}
              </label>
              {config.type === "input" && (
                <Input
                  type="text"
                  id={config.field}
                  placeholder={config.placeholder}
                  className="mt-1 block w-full mb-8"
                  aria-invalid={!!errors?.[field]}
                  aria-describedby={`${config.field}-help${errors?.[field] ? ` ${config.field}-error` : ""}`}
                  {...register(field, {
                    required: config.requiredError,
                  })}
                />
              )}
              {config.type === "textarea" && (
                <Textarea
                  id={config.field}
                  placeholder={config.placeholder}
                  className="mt-1 block w-full"
                  rows={4}
                  aria-invalid={!!errors?.[field]}
                  aria-describedby={`${config.field}-help${errors?.[field] ? ` ${config.field}-error` : ""}`}
                  {...register(field, {
                    required: config.requiredError,
                  })}
                />
              )}
              {errors && errors[field] && (
                <p
                  id={`${config.field}-error`}
                  className="text-sm mt-4 mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
                  role="alert"
                >
                  {String(errors[field]?.message)}
                </p>
              )}
            </section>
          );
        })}
      </section>
    </>
  );
}

export default React.memo(CoreFields);
