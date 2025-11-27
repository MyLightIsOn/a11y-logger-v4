"use client";

import React from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useRouter } from "next/navigation";
import { CoreFields } from "@/components/custom/issues/CoreFields";
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
import ButtonToolbar from "@/app/vpats/[vpatId]/ButtonToolbar";
import { Button } from "@/components/ui/button";
import { Loader2, SaveIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deviceTypeEnum } from "@/lib/validation/issues";
import type { DeviceType } from "@/types/common";

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
      assessment_id: undefined,
      criteria: [],
      tag_ids: [],
      screenshots: [],
      device_type: "desktop_web",
      browser: "",
      operating_system: "",
      assistive_technology: "",
    },
  });
  // When editing, prefill the form once initialValues arrive
  React.useEffect(() => {
    if (mode === "edit" && initialValues) {
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
        device_type:
          (initialValues.device_type as DeviceType | undefined) ??
          "desktop_web",
        browser: initialValues.browser ?? "",
        operating_system: initialValues.operating_system ?? "",
        assistive_technology: initialValues.assistive_technology ?? "",
      });
    }
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
  const isSaving = createIssue.isPending || updateIssue.isPending;
  const formId = mode === "create" ? "create-issue-form" : "edit-issue-form";
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
      const patch = {
        title: form.title || undefined,
        description: form.description || undefined,
        severity: form.severity || undefined,
        suggested_fix: form.suggested_fix || undefined,
        impact: form.impact || undefined,
        url: form.url || undefined,
        selector: form.selector || undefined,
        code_snippet: form.code_snippet || undefined,
        screenshots: uploadResult ?? form.screenshots ?? undefined,
        tag_ids: form.tag_ids ?? undefined,
        assessment_id:
          form.assessment_id !== undefined ? form.assessment_id : undefined,
        criteria: Array.isArray(form.criteria)
          ? (form.criteria as Array<{ version: WcagVersion; code: string }>)
          : undefined,
        device_type: (form.device_type as DeviceType) || undefined,
        browser: form.browser || undefined,
        operating_system: form.operating_system || undefined,
        assistive_technology: form.assistive_technology || undefined,
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
      device_type: (form.device_type as DeviceType) || "desktop_web",
      browser: form.browser || undefined,
      operating_system: form.operating_system || undefined,
      assistive_technology: form.assistive_technology || undefined,
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

      {/* AIAssistPanel should be visible only when creating an issue, regardless of assessment selection */}
      {mode === "create" && selectedAssessment && (
        <AIAssistPanel
          watch={watch}
          getValues={getValues}
          setValue={setValue}
          assessments={assessments}
        />
      )}

      {/* Form is shown after an assessment is selected */}
      {selectedAssessmentId && (
        <form id={formId} onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-wrap">
            <div className="p-6 pl-0 pt-0 w-full md:w-2/3">
              <CoreFields register={register} errors={errors} />

              {/* Environment / Device section */}
              <section className="bg-card rounded-lg p-4 border border-border mb-4 shadow-md">
                <h3 className="text-lg font-bold mb-2">Environment</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Optional: capture the device/browser context where you
                  observed the issue.
                </p>

                {/* Device Type */}
                <div className="mb-4">
                  <label htmlFor="device_type" className="block font-medium">
                    Device type
                  </label>
                  <div className="mt-2">
                    <Select
                      value={String(watch("device_type") ?? "desktop_web")}
                      onValueChange={(v) =>
                        setValue("device_type", v as DeviceType, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger aria-describedby="device_type-help">
                        <SelectValue placeholder="Select device type" />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          deviceTypeEnum.options as unknown as DeviceType[]
                        ).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt === "desktop_web"
                              ? "Desktop Web"
                              : opt === "mobile_web"
                                ? "Mobile Web"
                                : "Native"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p
                      id="device_type-help"
                      className="text-sm text-gray-500 mt-1"
                    >
                      Matches the allowed values enforced by the database.
                    </p>
                  </div>
                </div>

                {/* Browser */}
                <div className="mb-4">
                  <label htmlFor="browser" className="block font-medium">
                    Browser
                  </label>
                  <Input
                    id="browser"
                    placeholder="e.g., Chrome 130, Firefox 132"
                    {...register("browser")}
                  />
                </div>

                {/* Operating System */}
                <div className="mb-4">
                  <label
                    htmlFor="operating_system"
                    className="block font-medium"
                  >
                    Operating system
                  </label>
                  <Input
                    id="operating_system"
                    placeholder="e.g., macOS 15, Windows 11, iOS 18"
                    {...register("operating_system")}
                  />
                </div>

                {/* Assistive Technology */}
                <div>
                  <label
                    htmlFor="assistive_technology"
                    className="block font-medium"
                  >
                    Assistive technology
                  </label>
                  <Input
                    id="assistive_technology"
                    placeholder="e.g., VoiceOver, NVDA, JAWS, TalkBack"
                    {...register("assistive_technology")}
                  />
                </div>
              </section>

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
            </div>
            <div className="p-6 pr-0 pt-0 w-full md:w-1/3 dark:bg-border-border border-l border-border">
              <AttachmentsSection
                filesToUpload={filesToUpload}
                onFilesChangeAction={setFilesToUpload}
                uploading={uploading}
                uploadError={uploadError}
                screenshots={uploadedUrls}
                existingImages={
                  Array.isArray(watch("screenshots"))
                    ? (watch("screenshots") as unknown as string[])
                    : (initialValues?.screenshots ?? [])
                }
                onRemoveExistingImage={(url) => {
                  const current = Array.isArray(watch("screenshots"))
                    ? ([
                        ...(watch("screenshots") as unknown as string[]),
                      ] as string[])
                    : [];
                  const next = current.filter((u) => u !== url);
                  setValue("screenshots", next, { shouldDirty: true });
                }}
              />
            </div>
          </div>
        </form>
      )}
      {selectedAssessmentId && (
        <ButtonToolbar
          buttons={
            <>
              <Button
                variant="success"
                type="submit"
                form={formId}
                disabled={isSaving}
                aria-describedby="issue-submit-status"
              >
                {isSaving ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <SaveIcon className="h-4 w-4" aria-hidden="true" />
                )}
                {isSaving
                  ? "Saving Issue..."
                  : mode === "edit"
                    ? "Save Changes"
                    : "Create Issue"}
              </Button>
              <span
                id="issue-submit-status"
                role="status"
                aria-live="polite"
                className="sr-only"
              >
                {isSaving
                  ? mode === "edit"
                    ? "Saving Issue"
                    : "Creating Issue"
                  : ""}
              </span>
              <Button
                variant="destructive"
                onClick={() =>
                  mode === "edit" && issueId
                    ? router.push(`/issues/${issueId}`)
                    : router.push("/issues")
                }
                aria-label="Cancel"
              >
                <XIcon /> Cancel
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}

export default IssueForm;
