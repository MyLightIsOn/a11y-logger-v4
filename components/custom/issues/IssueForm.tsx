"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { CoreFields } from "@/components/custom/issues/CoreFields";
import { SubmitButton } from "@/components/custom/forms/submit-button";
import IssueFormAssessments from "@/components/custom/issues/IssueFormAssessments";
import AIAssistPanel from "@/components/custom/issues/AIAssistPanel";
import { WcagCriteriaSection } from "@/components/custom/issues/WcagCriteriaSection";
import { useTagsQuery } from "@/lib/query/use-tags-query";
import TagsSection from "@/components/custom/issues/TagsSection";
import type { Option } from "@/types/options";

import { useWcagCriteriaQuery } from "@/lib/query/use-wcag-criteria-query";
import { useAssessmentsQuery } from "@/lib/query/use-assessments-query";
import type { WcagVersion } from "@/types/issue";
import AttachmentsSection from "@/components/custom/issues/AttachmentsSection";
import { useFileUploads } from "@/lib/hooks/use-file-uploads";
import { useCreateIssueMutation } from "@/lib/query/use-create-issue-mutation";
import { normalizeCreateIssuePayload } from "@/lib/issues/constants";
import type { CreateIssueInput } from "@/lib/validation/issues";

function IssueForm({ mode = "create" }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CreateIssueInput>({
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
      criteria: [],
      tag_ids: [],
      screenshots: [],
    },
  });

  // Load assessments to resolve the selected assessment's WCAG version for AI context
  const { data: assessments = [] } = useAssessmentsQuery();

  // Uploads for attachments
  const {
    filesToUpload,
    setFilesToUpload,
    uploading,
    uploadError,
    uploadedUrls,
    upload,
  } = useFileUploads({
    folder: "a11y-logger/issues",
    onUploaded: (urls) => setValue("screenshots", urls, { shouldDirty: true }),
  });

  // Load tags for the Tags multiselect
  const {
    data: tags = [],
    isLoading: tagsLoading,
    error: tagsError,
  } = useTagsQuery();

  const tagOptions: Option[] = React.useMemo(
    () => tags.map((t) => ({ value: t.id, label: t.label })),
    [tags],
  );

  const selectedTagIdsUnknown = watch("tag_ids") as unknown;
  const selectedTagIds = Array.isArray(selectedTagIdsUnknown)
    ? (selectedTagIdsUnknown as string[])
    : [];

  const onTagsChange = React.useCallback(
    (arr: string[]) => {
      setValue("tag_ids", arr, { shouldValidate: true, shouldDirty: true });
    },
    [setValue],
  );

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

  const router = useRouter();
  const createIssue = useCreateIssueMutation();
  const onSubmit = async (form: CreateIssueInput) => {
    let uploadResult: string[] | undefined = undefined;
    if (filesToUpload && filesToUpload.length > 0) {
      uploadResult = await upload().then((urls) => {
        return urls;
      });
      if (uploadError) return; // abort on upload error; UI shows error in AttachmentsSection
      if (uploadResult && uploadResult.length) {
        setValue("screenshots", uploadResult, { shouldDirty: true });
      }
    }

    const assessmentId = form.assessment_id || selectedAssessment || "";
    if (!assessmentId) {
      // Assessment is required to create issue
      return;
    }
    const payload = normalizeCreateIssuePayload({
      title: form.title || "",
      description: form.description,
      severity: form.severity as unknown as string,
      status: "open",
      suggested_fix: form.suggested_fix,
      impact: form.impact,
      url: form.url,
      selector: form.selector,
      code_snippet: form.code_snippet,
      screenshots: uploadResult || [],
      tag_ids: (form.tag_ids as unknown as string[]) || [],
      criteria: Array.isArray(form.criteria)
        ? (form.criteria as Array<{ version: WcagVersion; code: string }>)
        : [],
      assessment_id: assessmentId,
    });

    createIssue.mutate(payload, {
      onSuccess: () => {
        router.push("/issues");
      },
    });
  };

  return (
    <div>
      <h2 className={"font-bold text-xl mb-4"}>
        {mode === "create" ? "Create New Issue" : "Edit Issue"}
      </h2>
      <IssueFormAssessments register={register} assessments={assessments} />

      {selectedAssessment && (
        <form
          id={mode === "create" ? "create-issue-form" : "edit-issue-form"}
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="flex flex-wrap">
            <div className="p-6 w-full md:w-2/3">
              <AIAssistPanel
                watch={watch}
                getValues={getValues}
                setValue={setValue}
                assessments={assessments}
              />

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

              <TagsSection
                isLoading={tagsLoading}
                error={tagsError}
                options={tagOptions}
                selected={selectedTagIds}
                onSelectedChangeAction={onTagsChange}
              />

              <div className="flex justify-end mt-4">
                <SubmitButton text={"Submit"} loadingText={"Saving..."} />
              </div>
            </div>
            <div className="p-6 w-full md:w-1/3 dark:bg-border-border border-l border-border">
              <AttachmentsSection
                filesToUpload={filesToUpload}
                onFilesChangeAction={setFilesToUpload}
                uploading={uploading}
                uploadError={uploadError}
                screenshots={uploadedUrls}
              />
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default IssueForm;
