"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { severityOptions } from "@/lib/issues/constants";
import type { CoreFieldsProps } from "@/types/issues-ui";

export function CoreFields({
  title,
  onTitleChangeAction,
  description,
  onDescriptionChangeAction,
  url,
  onUrlChangeAction,
  severity,
  onSeverityChangeAction,
  impact,
  onImpactChangeAction,
  suggestedFix,
  onSuggestedFixChangeAction,
  errors,
}: CoreFieldsProps) {
  return (
    <>
      <div className="bg-card rounded-lg p-4 border border-border mb-4">
        <label htmlFor="title" className="block text-xl font-bold">
          Title <span className={"text-destructive"}>*</span>
        </label>
        <p id="title-help" className="text-sm text-gray-500 mb-1">
          Provide a short title of the issue.
        </p>
        <Input
          type="text"
          id="title"
          value={title}
          placeholder={"Example: Search button not focusable..."}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onTitleChangeAction(e.target.value)
          }
          className="mt-1 block w-full"
          required
          aria-invalid={!!errors?.title}
          aria-describedby={`title-help${errors?.title ? " title-error" : ""}`}
        />
        {errors?.title && (
          <p
            id="title-error"
            className="text-sm text-red-600 mt-1"
            role="alert"
          >
            {String(errors.title.message)}
          </p>
        )}
        <div className="mb-6" />
      </div>

      <div className="bg-card rounded-lg p-4 border border-border mb-4">
        <label htmlFor="description" className="block text-xl font-bold">
          Description <span className={"text-destructive"}>*</span>
        </label>
        <p id="description-help" className="text-sm text-gray-500 mb-1">
          Provide a detailed description of the issue.
        </p>
        <Textarea
          id="description"
          value={description || ""}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onDescriptionChangeAction(e.target.value)
          }
          rows={4}
          className="mt-1 block w-full"
          placeholder="Example: The search button on the homepage is not focusable via keyboard."
          required
          aria-invalid={!!errors?.description}
          aria-describedby={`description-help${errors?.description ? " description-error" : ""}`}
        />
        {errors?.description && (
          <p
            id="description-error"
            className="text-sm text-red-600 mt-1"
            role="alert"
          >
            {String(errors.description.message)}
          </p>
        )}
        <div className="mb-6" />
      </div>

      <div className="bg-card rounded-lg p-4 border border-border mb-4">
        <label htmlFor="url" className="block text-xl font-bold">
          URL
        </label>
        <p id="url-help" className="text-sm text-gray-500 mb-1">
          Enter the URL of the page where the issue was found.
        </p>
        <Input
          type="url"
          id="url"
          value={url}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onUrlChangeAction(e.target.value)
          }
          className="mt-1 block w-full placeholder:text-gray-400"
          placeholder={"Example: https://example.com/page-with-issue"}
          aria-invalid={!!errors?.url}
          aria-describedby={`url-help${errors?.url ? " url-error" : ""}`}
        />
        {errors?.url && (
          <p id="url-error" className="text-sm text-red-600 mt-1" role="alert">
            {String(errors.url.message)}
          </p>
        )}
        <div className="mb-6" />
      </div>

      <div className="bg-card rounded-lg p-4 border border-border mb-4">
        <label htmlFor="severity" className="block text-xl font-bold">
          Severity <span className={"text-destructive"}>*</span>
        </label>
        <p id="severity-help" className="text-sm text-gray-500 mb-1">
          Choose the severity of the issue.
        </p>
        <Select
          value={severity || "low"}
          onValueChange={onSeverityChangeAction}
        >
          <SelectTrigger
            id="severity"
            className="w-full"
            aria-invalid={!!errors?.severity}
            aria-describedby={`severity-help${errors?.severity ? " severity-error" : ""}`}
          >
            <SelectValue placeholder="Select severity" />
          </SelectTrigger>
          <SelectContent>
            {severityOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.severity && (
          <p
            id="severity-error"
            className="text-sm text-red-600 mt-1"
            role="alert"
          >
            {String(errors.severity.message)}
          </p>
        )}
        <div className="mb-6" />
      </div>

      <div className="bg-card rounded-lg p-4 border border-border mb-4">
        <label htmlFor="impact" className="block text-xl font-bold">
          Impact
        </label>
        <p className="text-sm text-gray-500 mb-1">
          Describe how this issue affects users, particularly those with
          disabilities.
        </p>
        <Textarea
          id="impact"
          value={impact}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onImpactChangeAction(e.target.value)
          }
          rows={3}
          className="mt-1 block w-full mb-8"
          placeholder="Example: Screen reader users cannot understand the content or purpose of the banner image, missing important promotional information."
        />
      </div>

      <div className="bg-card rounded-lg p-4 border border-border mb-4">
        <label htmlFor="suggestedFix" className="block text-xl font-bold">
          Suggested Fix
        </label>
        <p className="text-sm text-gray-500 mb-1">
          Provide a specific recommendation for how to fix this issue.
        </p>
        <Textarea
          id="suggestedFix"
          value={suggestedFix}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onSuggestedFixChangeAction(e.target.value)
          }
          rows={3}
          className="mt-1 block w-full mb-8"
          placeholder='Example: Add descriptive alt text to the banner image: <img src="banner.jpg" alt="Company promotional banner showing our latest products">'
        />
      </div>
    </>
  );
}

export default CoreFields;
