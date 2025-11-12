"use client";

import React from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
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
import { useUpdateIssueMutation } from "@/lib/query/use-update-issue-mutation";
import { normalizeCreateIssuePayload } from "@/lib/issues/constants";
import type { CreateIssueInput } from "@/lib/validation/issues";

type IssueFormProps = {
  mode?: "create" | "edit";
  issueId?: string; // required for edit mode
  initialValues?: Partial<CreateIssueInput> | null; // used to prefill in edit mode
};

function IssueForm({
  mode = "create",
  issueId,
  initialValues,
}: IssueFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
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
      severity: "3",
      status: "open",
      // Only include keys defined by CreateIssueInput
      assessment_id: undefined,
      criteria: [],
      tag_ids: [],
      screenshots: [],
    },
  });
  // When editing, prefill the form once initialValues arrive
  React.useEffect(() => {
    if (mode === "edit" && initialValues) {
      // Only set keys that exist on the schema
      reset({
        title: initialValues.title ?? "",
        description: initialValues.description ?? "",
        impact: initialValues.impact ?? "",
        url: initialValues.url ?? "",
        selector: initialValues.selector ?? "",
        code_snippet: initialValues.code_snippet ?? "",
        suggested_fix: initialValues.suggested_fix ?? "",
        severity: initialValues.severity ?? "3",
        status: initialValues.status ?? "open",
        assessment_id: initialValues.assessment_id,
        criteria: Array.isArray(initialValues.criteria)
          ? initialValues.criteria
          : [],
        tag_ids: initialValues.tag_ids ?? [],
        screenshots: initialValues.screenshots ?? [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialValues, reset]);

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

  const selectedAssessment = watch("assessment_id") as unknown as
    | string
    | undefined;
  const selectedAssessmentId = selectedAssessment
    ? String(selectedAssessment)
    : "";

  // Derive assessment context for WCAG filtering
  const assessmentObj = assessments.find(
    (a) => String(a.id) === selectedAssessmentId,
  );
  const effectiveWcagVersion = assessmentObj?.wcag_version as
    | WcagVersion
    | undefined;

  const router = useRouter();
  const createIssue = useCreateIssueMutation();
  const updateIssue = useUpdateIssueMutation();
  const onSubmit: SubmitHandler<CreateIssueInput> = async (form) => {
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

    if (mode === "edit") {
      // Update existing issue
      if (!issueId) return;
      // Build patch payload; send arrays as-is, omit undefineds
      const patch = {
        title: form.title || undefined,
        description: form.description || undefined,
        severity: form.severity || undefined,
        // status is not editable in this form currently
        suggested_fix: form.suggested_fix || undefined,
        impact: form.impact || undefined,
        url: form.url || undefined,
        selector: form.selector || undefined,
        code_snippet: form.code_snippet || undefined,
        screenshots: uploadResult ?? form.screenshots ?? undefined,
        tag_ids: form.tag_ids ?? undefined,
        criteria: Array.isArray(form.criteria)
          ? (form.criteria as Array<{ version: WcagVersion; code: string }>)
          : undefined,
      };
      updateIssue.mutate(
        { id: issueId, payload: patch },
        {
          onSuccess: (data) => {
            router.push(`/issues/${data.id}`);
          },
        },
      );
      return;
    }

    // Create flow
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
      <IssueFormAssessments
        register={register}
        assessments={assessments}
        selectedAssessmentId={selectedAssessmentId}
      />

      {selectedAssessmentId && (
        <form
          id={mode === "create" ? "create-issue-form" : "edit-issue-form"}
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="flex flex-wrap">
            <div className="p-6 w-full md:w-2/3">
              {!selectedAssessment && (
                <AIAssistPanel
                  watch={watch}
                  getValues={getValues}
                  setValue={setValue}
                  assessments={assessments}
                />
              )}

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
