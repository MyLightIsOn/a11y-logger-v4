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
    <div>
      {issueFormConfig.map((config) => {
        const field = config.field as keyof CreateIssueInput;
        return (
          <section
            key={config.field}
            className="bg-card rounded-lg p-4 border border-border mb-4 shadow-md"
          >
            <label htmlFor={config.field} className="block text-lg font-bold">
              {config.label}
              {config.required && <span className={"text-destructive"}>*</span>}
            </label>
            <p id="severity-help" className="text-sm text-gray-500 mb-1">
              {config.subtext}
            </p>
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
                className="mt-1 block w-full mb-8"
                rows={4}
                aria-invalid={!!errors?.[field]}
                aria-describedby={`${config.field}-help${errors?.[field] ? ` ${config.field}-error` : ""}`}
                {...register(field, {
                  required: config.requiredError,
                })}
              />
            )}
            {config.type === "select" && (
              <div
                className={
                  "mb-8 bg-card border-border border rounded-md px-4 py-2 text-lg w-[250px]"
                }
              >
                <select
                  className={"bg-transparent w-full rounded-md"}
                  {...register("severity")}
                >
                  <option value={config.placeholder}>
                    {config.placeholder}
                  </option>
                  /
                  {config.selectOptions &&
                    config.selectOptions.map((opt) => {
                      let severityText;

                      switch (opt) {
                        case "1":
                          severityText = "Critical";
                          break;
                        case "2":
                          severityText = "High";
                          break;
                        case "3":
                          severityText = "Medium";
                          break;
                        case "4":
                          severityText = "Low";
                          break;
                        default:
                          severityText = undefined; // or whatever default you want
                      }

                      return (
                        <option key={opt} value={opt}>
                          {severityText}
                        </option>
                      );
                    })}
                </select>
              </div>
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
    </div>
  );
}

export default React.memo(CoreFields);
