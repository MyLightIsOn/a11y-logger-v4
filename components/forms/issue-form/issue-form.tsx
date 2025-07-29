import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import axios, { AxiosError, AxiosResponse } from "axios";
import { MultiSelect } from "@/components/ui/multi-select";
import systemMessage from "@/utils/issue-system-message";
import { uploadMultipleToCloudinary } from "@/utils/cloudinary";
import { AlertTriangle } from "lucide-react";
import { X, SaveIcon } from "lucide-react";
import Image from "next/image";
import { getAllTags } from "@/data/services/tag-service";
import wcagCriteria from "@/utils/wcag_standards";
import { Issue } from "@/types/issue";
import { Assessment } from "@/types/assessment";
import AiIcon from "@/components/AiIcon";

// Define SelectItem type to match the one in multi-select.tsx
type SelectItem =
  | string
  | { value: string; label?: string }
  | Record<string, unknown>;

// Define the IssueStatus enum
enum IssueStatus {
  OPEN = "open",
  CLOSED = "closed",
  ARCHIVE = "archive",
}

// Props for the IssueForm component
interface IssueFormProps {
  issue: Issue; // Optional issue for editing
  onSubmit: (updatedIssue: Issue) => Promise<void>;
  onDelete?: (id: string) => Promise<void>; // Optional delete handler
  onCancel: () => void;
  assessmentId?: string; // Optional assessment ID for pre-selecting an assessment
}

const IssueForm: React.FC<IssueFormProps> = ({
  issue,
  onSubmit,
  onCancel,
  assessmentId,
}) => {
  // Form state
  const [title, setTitle] = useState<string>("");
  const [aiAssistanceDescription, setAiAssistanceDescription] =
    useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [severity, setSeverity] = useState<string>("medium"); // Default to medium
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [selectedstandards, setSelectedstandards] = useState<SelectItem[]>([]);
  const [suggestedFix, setSuggestedFix] = useState<string>("");
  const [impact, setImpact] = useState<string>("");
  const [screenshots, setScreenshots] = useState<string[]>([]); // Changed to string[] for multiple image URLs
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]); // Store the actual file objects
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]); // Store image preview URLs
  const [codeSnippet, setCodeSnippet] = useState<string>("");
  const [selector, setSelector] = useState<string>("");
  const [url, setUrl] = useState<string>(""); // URL of the page where the issue was found
  const [issue_status, setIssueStatus] = useState<IssueStatus>(
    IssueStatus.OPEN,
  ); // Default to 'open'
  const [selectedTags, setSelectedTags] = useState<SelectItem[]>([]);
  const [userTags, setUserTags] = useState<{ label: string; value: string }[]>(
    [],
  );
  const [userStandards, setUserStandards] = useState<
    { label: string; documentId: string }[]
  >([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingAssessments, setIsLoadingAssessments] =
    useState<boolean>(false);
  const [isLoadingTags, setIsLoadingTags] = useState<boolean>(false);
  const [isLoadingStandards, setIsLoadingStandards] = useState<boolean>(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [isUploadingImages, setIsUploadingImages] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Fetch assessments for the dropdown
  useEffect(() => {
    const fetchAssessments = async () => {
      setIsLoadingAssessments(true);
      try {
        const response: AxiosResponse<Assessment[]> =
          await axios.get("/api/assessments");
        setAssessments(response.data);

        // If editing an issue and we have its assessment as an object
        if (issue && issue.assessment && typeof issue.assessment !== "string") {
          // Find the matching assessment in our fetched list to get its ID
          const matchingAssessment = response.data.find(
            (a: Assessment) => a.documentId === issue.assessment?.documentId,
          );
          if (matchingAssessment) {
            setSelectedAssessmentId(matchingAssessment.documentId);
          }
        }
      } catch (err: unknown) {
        const error = err as Error | AxiosError;
        console.error("Error fetching assessments:", error);
        setError("Failed to load assessments. Please try again.");
      } finally {
        setIsLoadingAssessments(false);
      }
    };

    fetchAssessments();
  }, [issue]); // Add issue as a dependency

  // Fetch user's tags for the dropdown
  useEffect(() => {
    const fetchUserTags = async () => {
      setIsLoadingTags(true);
      try {
        const tags = await getAllTags();
        // Transform tags to the format expected by MultiSelect
        const formattedTags = tags.map((tag) => ({
          label: tag.label || "",
          value: tag.documentId,
        }));
        setUserTags(formattedTags);
      } catch (err: unknown) {
        const error = err as Error | AxiosError;
        console.error("Error fetching user tags:", error);
        // Don't set error state to avoid confusing the user if tag fetching fails
      } finally {
        setIsLoadingTags(false);
      }
    };

    fetchUserTags();
  }, []);

  // Use wcagCriteria directly for the dropdown
  useEffect(() => {
    setIsLoadingStandards(true);
    try {
      // Transform wcagCriteria to the format expected by MultiSelect
      const formattedStandards = wcagCriteria.map((criterion: string) => ({
        label: criterion,
        documentId: criterion,
      }));
      setUserStandards(formattedStandards);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error processing WCAG criteria:", error);
      // Don't set error state to avoid confusing the user if processing fails
    } finally {
      setIsLoadingStandards(false);
    }
  }, []);

  // Initialize form with issue data if editing
  useEffect(() => {
    if (issue) {
      setTitle(issue.title);
      setDescription(issue.description);
      setAiAssistanceDescription(""); // No stored AI assistance description when editing
      setSeverity(issue.severity);

      // Handle assessment which could be a string ID or an object
      if (issue.assessmentId) {
        setSelectedAssessmentId(issue.assessmentId);
      } else if (issue.assessment) {
        if (typeof issue.assessment === "string") {
          setSelectedAssessmentId(issue.assessment);
        } else if (issue.assessment.documentId) {
          setSelectedAssessmentId(issue.assessment.documentId);
        }
      }
      // Handle standards in the new format (string or array of strings)
      if (issue.standards) {
        if (typeof issue.standards === "string") {
          // If it's a comma-separated string, split it and trim each item
          if (issue.standards.includes(",")) {
            const standardsArray = issue.standards
              .replace(/"/g, "") // Remove quotes
              .split(",")
              .map((item) => item.trim());
            setSelectedstandards(standardsArray);
          } else {
            // Single value
            setSelectedstandards([issue.standards]);
          }
        } else if (Array.isArray(issue.standards)) {
          // If it's already an array, use it directly
          setSelectedstandards(issue.standards);
        } else {
          setSelectedstandards([]);
        }
      } else {
        setSelectedstandards([]);
      }
      setSuggestedFix(issue.suggestedFix || "");
      setImpact(issue.impact || "");

      // Handle screenshots as an array of strings
      if (issue.screenshots && Array.isArray(issue.screenshots)) {
        setScreenshots(issue.screenshots);
        // Set preview images for existing screenshots
        setScreenshotPreviews(issue.screenshots);
      } else if (issue.screenshots) {
        // For backward compatibility, handle screenshots as a comma-separated string
        const screenshotArray = issue.screenshots
          .split(",")
          .map((url) => url.trim());
        setScreenshots(screenshotArray);
        setScreenshotPreviews(screenshotArray);
      } else {
        setScreenshots([]);
        setScreenshotPreviews([]);
      }

      setCodeSnippet(issue.codeSnippet || "");
      setSelector(issue.selector || "");
      setUrl(issue.url || "");
      if (
        issue.issue_status &&
        Object.values(IssueStatus).includes(issue.issue_status as IssueStatus)
      ) {
        setIssueStatus(issue.issue_status as IssueStatus);
      } else {
        setIssueStatus(IssueStatus.OPEN);
      }
      // Handle tags as an array of strings or convert from comma-separated string for backward compatibility
      setSelectedTags(
        issue.tags
          ? Array.isArray(issue.tags)
            ? issue.tags
            : issue.tags.split(",").map((tag) => tag.trim())
          : [],
      );
    } else if (assessmentId) {
      setSelectedAssessmentId(assessmentId);
    }
  }, [issue, assessmentId]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (!selectedAssessmentId) {
      setError("Please select an assessment");
      setIsSubmitting(false);
      return;
    }

    try {
      // Upload any new image files to Cloudinary
      let allScreenshotUrls = [...screenshots]; // Start with existing URLs

      if (screenshotFiles.length > 0) {
        setIsUploadingImages(true);
        try {
          const uploadedUrls =
            await uploadMultipleToCloudinary(screenshotFiles);
          // Combine existing URLs with newly uploaded URLs
          allScreenshotUrls = [...allScreenshotUrls, ...uploadedUrls];
        } catch (uploadError: unknown) {
          const error = uploadError as Error;
          console.error("Error uploading images:", error);
          setError("Failed to upload images. Please try again.");
          setIsSubmitting(false);
          setIsUploadingImages(false);
          return;
        } finally {
          setIsUploadingImages(false);
        }
      }

      // Convert standards array to a JSON string for the new format
      const standardsString =
        selectedstandards.length > 0
          ? JSON.stringify(
              selectedstandards
                .map((item) =>
                  typeof item === "string" ? item : String(item.value || ""),
                )
                .join(","),
            )
          : "";

      await onSubmit({
        title,
        description,
        severity,
        // Use assessmentId field for consistency with Strapi expectations
        assessmentId: selectedAssessmentId,
        // Keep assessment field as string ID for backward compatibility
        assessment: selectedAssessmentId,
        standards: standardsString, // Pass as a JSON string for the new format
        suggestedFix,
        impact,
        screenshots: allScreenshotUrls, // Pass array of image URLs
        codeSnippet: codeSnippet,
        selector,
        url,
        issue_status,
        tags: selectedTags.map((item) =>
          typeof item === "string" ? item : String(item.value || ""),
        ),
        id: "",
      });

      // Clear screenshot files after successful submission
      setScreenshotFiles([]);
    } catch (err: unknown) {
      const error = err as Error;
      setError("Failed to save issue. Please try again.");
      console.error("Error submitting issue:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle AI generation
  const handleGenerateIssue = async (): Promise<void> => {
    if (!aiAssistanceDescription.trim()) {
      setError(
        "Please enter an AI Assistance Description before generating an issue",
      );
      return;
    }

    setIsGeneratingAI(true);
    setError("");

    try {
      const response: AxiosResponse<{ aiResponse: string }> = await axios.post(
        "/api/generate-issue",
        {
          description: aiAssistanceDescription,
          systemMessage,
        },
      );

      const { aiResponse } = response.data;

      try {
        // Parse the AI response as JSON
        const parsedResponse = JSON.parse(aiResponse) as Record<string, any>;

        // Update form fields with AI response
        if (parsedResponse.title) setTitle(parsedResponse.title);
        if (parsedResponse.description)
          setDescription(parsedResponse.description);
        if (parsedResponse.severity) setSeverity(parsedResponse.severity);
        // Handle both old and new schema attributes
        if (parsedResponse.suggestedFix)
          setSuggestedFix(parsedResponse.suggestedFix);
        else if (parsedResponse.aIFix) setSuggestedFix(parsedResponse.aIFix);
        // Handle both old and new schema attributes
        if (parsedResponse.impact) setImpact(parsedResponse.impact);
        else if (parsedResponse.AIimpact) setImpact(parsedResponse.AIimpact);
        // Set URL if provided
        if (parsedResponse.url) setUrl(parsedResponse.url);
        // Handle standards in different formats
        if (parsedResponse.standards) {
          let criteriaArray: string[] = [];

          // Convert to array if it's not already
          if (Array.isArray(parsedResponse.standards)) {
            criteriaArray = parsedResponse.standards;
          } else if (typeof parsedResponse.standards === "string") {
            // If it's a comma-separated string, split it
            if (parsedResponse.standards.includes(",")) {
              criteriaArray = parsedResponse.standards
                .split(",")
                .map((item: string) => item.trim());
            } else {
              // Single value
              criteriaArray = [parsedResponse.standards];
            }
          }

          // Map the criteria codes (e.g., "1.1.1") to full criteria strings from wcagCriteria array
          // This handles cases where the AI returns just the code without the description
          const mappedCriteria = criteriaArray.map((criterion: string) => {
            // If the criterion is already in our list, use it as is
            if (wcagCriteria.includes(criterion)) {
              return criterion;
            }

            // Try to find a matching criterion by code
            const matchingCriterion = wcagCriteria.find(
              (wcagCriterion: string) =>
                wcagCriterion.startsWith(criterion.trim()),
            );

            return matchingCriterion || criterion;
          });

          setSelectedstandards(mappedCriteria);
        }
      } catch (parseError: unknown) {
        const error = parseError as Error;
        console.error("Error parsing AI response:", error);
        setError("Failed to parse AI response. Please try again.");
      }
    } catch (err: unknown) {
      const error = err as Error | AxiosError;
      console.error("Error generating issue with AI:", error);
      setError("Failed to generate issue with AI. Please try again.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Handle screenshot file selection
  const handleScreenshotChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files);
    setScreenshotFiles((prev: File[]) => [...prev, ...newFiles]);

    // Generate previews for the new files
    newFiles.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = (): void => {
        setScreenshotPreviews((prev: string[]) => [
          ...prev,
          reader.result as string,
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle screenshot deletion
  const handleDeleteScreenshot = (index: number): void => {
    // Check if this is a file or an existing URL
    const isExistingUrl = index < screenshots.length;

    if (isExistingUrl) {
      // Remove from existing screenshots
      setScreenshots((prev: string[]) => prev.filter((_, i) => i !== index));
      setScreenshotPreviews((prev: string[]) =>
        prev.filter((_, i) => i !== index),
      );
    } else {
      // Adjust index for the screenshotFiles array
      const fileIndex = index - screenshots.length;

      // Remove from files and previews
      setScreenshotFiles((prev: File[]) =>
        prev.filter((_, i) => i !== fileIndex),
      );
      setScreenshotPreviews((prev: string[]) => {
        const newPreviews = [...prev];
        newPreviews.splice(index, 1);
        return newPreviews;
      });
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        {issue ? "Edit Issue" : "Create New Issue"}
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex flex-wrap bg-white rounded-lg border border-primary shadow-md dark:bg-card dark:border-border">
          {/* Left Column - Main Form Fields */}
          <div className="p-6 w-full md:w-2/3">
            {!issue && (
              <div className="mb-4 bg-tags/80 dark:bg-tags/10 p-6 rounded-md border-button-background border">
                <div
                  className={
                    "text-md font-medium text-gray-700 dark:text-white mb-4"
                  }
                >
                  <p className={"mb-4"}>
                    You can enter a description here and press the Generate
                    Issue Button to have the rest of the issue filled out by the
                    AI. For the best results, please include the following
                    information:
                  </p>

                  <ol className={"mb-5 pl-10 list-decimal"}>
                    <li>
                      <span className={"font-bold pl-1"}>Component</span>: What
                      element is affected? (e.g., &#34;Search button&#34;)
                    </li>
                    <li>
                      <span className={"font-bold pl-1"}>Location</span>: Where
                      does the issue occur? (e.g., &#34;Homepage&#34;)
                    </li>
                    <li>
                      <span className={"font-bold pl-1"}>
                        What&apos;s Happening?
                      </span>
                      : What is wrong? (e.g., &#34;Not focusable via
                      keyboard&#34;)
                    </li>
                    <li>
                      <span className={"font-bold pl-1"}>
                        Expected Behavoir (Optional)
                      </span>
                      : What is the expected behavoir?
                    </li>
                  </ol>
                  <p className={"flex items-center mb-4 text-sm"}>
                    <AlertTriangle className="h-10 w-10 fill-amber-200 mr-2 dark:stroke-black" />
                    Important: If you plan to use AI assistance, please do so
                    before filling out any issue fields. The AI will overwrite
                    any existing field data when generating the issue details.
                  </p>
                </div>

                <label
                  htmlFor="aiAssistanceDescription"
                  className="block text-xl font-bold"
                >
                  AI Assistance Description
                </label>
                <Textarea
                  id="aiAssistanceDescription"
                  value={aiAssistanceDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setAiAssistanceDescription(e.target.value)
                  }
                  rows={4}
                  placeholder="Example: The search button on the homepage is not operable via keyboard. It should be focusable and activated using the Enter key."
                  className="mt-1 block w-full mb-4"
                />
                <Button
                  className={"bg-button-background text-md gap-4"}
                  onClick={handleGenerateIssue}
                  disabled={isGeneratingAI || !aiAssistanceDescription.trim()}
                >
                  {isGeneratingAI ? "Generating..." : "Generate Issue"}
                  <AiIcon />
                </Button>
              </div>
            )}
            <div className="mb-4">
              <label htmlFor="title" className="block text-xl font-bold">
                Title <span className={"text-destructive"}>*</span>
              </label>
              <p className="text-sm text-gray-500 mb-1">
                Provide a short title of the issue.
              </p>
              <Input
                type="text"
                id="title"
                value={title}
                placeholder={"Example: Search button not focusable..."}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTitle(e.target.value)
                }
                className="mt-1 block w-full mb-8"
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="assessment" className="block text-xl font-bold">
                Assessment <span className={"text-destructive"}>*</span>
              </label>
              <p className="text-sm text-gray-500 mb-1">
                Select an assessment to associate with this issue.
              </p>
              <Select
                value={selectedAssessmentId}
                onValueChange={setSelectedAssessmentId}
                disabled={isLoadingAssessments}
              >
                <SelectTrigger className="w-full mb-8">
                  <SelectValue placeholder="Select an assessment" />
                </SelectTrigger>
                <SelectContent>
                  {assessments.map((assessment) => (
                    <SelectItem
                      key={assessment.documentId}
                      value={assessment.documentId}
                    >
                      {assessment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLoadingAssessments && (
                <p className="text-sm text-gray-500 mt-1">
                  Loading assessments...
                </p>
              )}
            </div>
            <div className="mb-4">
              <label htmlFor="description" className="block text-xl font-bold">
                Description <span className={"text-destructive"}>*</span>
              </label>
              <p className="text-sm text-gray-500 mb-1">
                Provide a detailed description of the issue.
              </p>
              <Textarea
                id="description"
                value={description || ""}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDescription(e.target.value)
                }
                rows={4}
                className="mt-1 block w-full mb-8"
                placeholder="Example: The search button on the homepage is not focusable via keyboard."
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="severity" className="block text-xl font-bold">
                Severity <span className={"text-destructive"}>*</span>
              </label>
              <p className="text-sm text-gray-500 mb-1">
                Choose the severity of the issue.
              </p>
              <Select value={severity || "low"} onValueChange={setSeverity}>
                <SelectTrigger className="w-full mb-8">
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mb-4">
              <label
                htmlFor="standards"
                className="block text-xl font-bold mb-1"
              >
                Standards
              </label>
              <p className="text-sm text-gray-500 mb-1">
                Choose the related standards criteria that apply to this issue.
              </p>
              {isLoadingStandards ? (
                <p className="text-sm text-gray-500 mt-1">
                  Loading standards...
                </p>
              ) : (
                <MultiSelect
                  options={userStandards}
                  selected={selectedstandards}
                  onChangeAction={setSelectedstandards}
                  placeholder="Select standards..."
                  className="mt-1 block w-full border-input border p-2 mb-8 bg-input-background"
                />
              )}
            </div>
            <div className="mb-4">
              <label htmlFor="issue_status" className="block text-xl font-bold">
                Status <span className={"text-destructive"}>*</span>
              </label>
              <p className="text-sm text-gray-500 mb-1">
                Choose the status of the issue.
              </p>
              <Select
                value={issue_status}
                onValueChange={(value) => {
                  if (
                    Object.values(IssueStatus).includes(value as IssueStatus)
                  ) {
                    setIssueStatus(value as IssueStatus);
                  }
                }}
              >
                <SelectTrigger className="w-fit mb-8">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={IssueStatus.OPEN}>Open</SelectItem>
                  <SelectItem value={IssueStatus.CLOSED}>Closed</SelectItem>
                  <SelectItem value={IssueStatus.ARCHIVE}>Archive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mb-4">
              <label htmlFor="codeSnippet" className="block text-xl font-bold">
                Code Snippet
              </label>
              <p className="text-sm text-gray-500 mb-1">
                Enter a code snippet that represents the issue.
              </p>
              <Textarea
                id="codeSnippet"
                value={codeSnippet}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setCodeSnippet(e.target.value)
                }
                rows={3}
                className="mt-1 block w-full mb-8"
                placeholder="Example: <button class='btn btn-primary'>Search</button>"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="selector" className="block text-xl font-bold">
                Selector
              </label>
              <p className="text-sm text-gray-500 mb-1">
                Enter a CSS selector for the issue.
              </p>
              <Input
                type="text"
                id="selector"
                value={selector}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSelector(e.target.value)
                }
                className="mt-1 block w-full mb-8"
                placeholder={"Example: .btn-primary"}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="url" className="block text-xl font-bold">
                URL
              </label>
              <p className="text-sm text-gray-500 mb-1">
                Enter the URL of the page where the issue was found.
              </p>
              <Input
                type="url"
                id="url"
                value={url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setUrl(e.target.value)
                }
                className="mt-1 block w-full mb-8 placeholder:text-gray-400"
                placeholder={"Example: https://example.com/page-with-issue"}
              />
            </div>
            <div className="mb-4">
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
                  setImpact(e.target.value)
                }
                rows={3}
                className="mt-1 block w-full mb-8"
                placeholder="Example: Screen reader users cannot understand the content or purpose of the banner image, missing important promotional information."
              />
            </div>
            <div className="mb-4">
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
                  setSuggestedFix(e.target.value)
                }
                rows={3}
                className="mt-1 block w-full mb-8"
                placeholder='Example: Add descriptive alt text to the banner image: <img src="banner.jpg" alt="Company promotional banner showing our latest products">'
              />
            </div>
            <div className="mb-4">
              <label htmlFor="tags" className="block text-xl font-bold mb-1">
                Tags
              </label>
              <p className="text-sm text-gray-500 mb-1">
                Choose tags that apply to this issue.
              </p>
              {isLoadingTags ? (
                <p className="text-sm text-gray-500 mt-1">Loading tags...</p>
              ) : (
                <MultiSelect
                  options={userTags}
                  selected={selectedTags}
                  onChangeAction={setSelectedTags}
                  placeholder="Select tags..."
                  className="mt-1 block w-full border-input border p-2 mb-8 bg-input-background"
                />
              )}
            </div>
          </div>

          {/* Right Column - Screenshots */}
          <div className="p-6 w-full md:w-1/3 dark:bg-border-border border-l border-border">
            <div>
              <label
                htmlFor="screenshots"
                className="block text-xl font-bold mb-2"
              >
                Screenshots
              </label>

              {/* Image previews */}
              {screenshotPreviews.length > 0 && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {screenshotPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={preview}
                        alt={`Screenshot ${index + 1}`}
                        width={300}
                        height={160}
                        className="h-40 w-full object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteScreenshot(index)}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Delete screenshot ${index + 1}`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* File input */}
              <div className="mt-1">
                <label
                  htmlFor="screenshot-upload"
                  className="flex justify-center px-6 pt-5 pb-6 border-2 border-primary border-dashed rounded-md cursor-pointer hover:border-button-background"
                >
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <span>Upload screenshots</span>
                      <input
                        id="screenshot-upload"
                        name="screenshot-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        className="sr-only"
                        onChange={handleScreenshotChange}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                </label>
              </div>

              {isUploadingImages && (
                <p className="mt-2 text-sm text-gray-500">
                  Uploading images...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel <X />
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className={"bg-success dark:bg-success"}
          >
            {isSubmitting ? "Saving..." : "Save"} <SaveIcon />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default IssueForm;
