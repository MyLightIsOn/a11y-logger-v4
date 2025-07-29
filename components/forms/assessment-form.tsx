import React, { useState, useEffect } from "react";
import axios, { AxiosError, AxiosResponse } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, SaveIcon } from "lucide-react";
import { Tag } from "@/types/tag";
import { Project } from "@/types/project";
import { Assessment } from "@/types/assessment";
import { getAllTags } from "@/data/services/tag-service";

// Define SelectItem type to match the one in multi-select.tsx
type SelectItem = string | { value: string; label?: string } | Record<string, unknown>;

// Props for the AssessmentForm component
interface AssessmentFormProps {
  assessment?: Assessment; // Optional assessment for editing
  onSubmit: (assessment: {
    name: string;
    description: string | undefined;
    guidelines?: string;
    projects: string[];
    tags: string[];
    createdAt?: string;
    updatedAt?: string;
  }) => Promise<void>;
  onDelete?: (documentId: string) => Promise<void>; // Optional delete handler
  onCancel: () => void;
}

const AssessmentForm: React.FC<AssessmentFormProps> = ({
  assessment,
  onSubmit,
  onCancel,
}) => {
  // Form state
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [guidelines, setGuidelines] = useState<string>("wcag 2.1 AA");
  const [selectedProjectIds, setSelectedProjectIds] = useState<SelectItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Tag state
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<SelectItem[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState<boolean>(false);

  // Fetch projects and tags for the dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const response: AxiosResponse<Project[]> = await axios.get("/api/projects");
        setProjects(response.data);
      } catch (err: unknown) {
        const error = err as Error | AxiosError;
        console.error("Error fetching projects:", error);
        setError("Failed to load projects. Please try again.");
      } finally {
        setIsLoadingProjects(false);
      }
    };

    const fetchTags = async () => {
      setIsLoadingTags(true);
      try {
        const fetchedTags = await getAllTags();
        setTags(fetchedTags);
      } catch (err: unknown) {
        const error = err as Error | AxiosError;
        console.error("Error fetching tags:", error);
        setError("Failed to load tags. Please try again.");
      } finally {
        setIsLoadingTags(false);
      }
    };

    fetchProjects();
    fetchTags();
  }, []);

  // Initialize form with assessment data if editing
  useEffect(() => {
    if (assessment) {
      setName(assessment.name);
      setDescription(assessment.description || "");
      setGuidelines(assessment.guidelines || "");

      // Set selected project IDs if assessment has projects
      if (assessment.projects && assessment.projects.length > 0) {
        const projectIds: SelectItem[] = assessment.projects.map((project) => {
          if (typeof project === "string") {
            return project;
          } else if (project.documentId) {
            return project.documentId.toString();
          }
          return "";
        }).filter(id => id !== "");

        setSelectedProjectIds(projectIds);
      }

      // Set selected tag IDs if assessment has tags
      if (assessment.tags && assessment.tags.length > 0) {
        const tagIds: SelectItem[] = assessment.tags.map((tag) => {
          if (typeof tag === "string") {
            return tag;
          } else if (tag.documentId) {
            return tag.documentId.toString();
          }
          return "";
        }).filter(id => id !== "");

        setSelectedTagIds(tagIds);
      }
    }
  }, [assessment]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await onSubmit({
        name,
        description,
        guidelines,
        projects: selectedProjectIds.map(item => typeof item === 'string' ? item : String(item.value || '')),
        tags: selectedTagIds.map(item => typeof item === 'string' ? item : String(item.value || '')),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      setError("Failed to save assessment. Please try again.");
      // Don't log to console in tests to avoid noise
      if (process.env.NODE_ENV !== "test") {
        const error = err as Error | AxiosError;
        console.error("Error submitting assessment:", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        {assessment ? "Edit Assessment" : "Create New Assessment"}
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg border border-primary shadow-md dark:bg-card dark:border-border overflow-hidden">
          <div className="p-6">
            <div className="mb-4">
              <label htmlFor="name" className="block text-xl font-bold">
                Name <span className={"text-destructive"}>*</span>
              </label>
              <p className="text-sm text-gray-500 mb-1">
                Provide a name for this assessment.
              </p>
              <Input
                type="text"
                id="name"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                className="mt-1 block w-full mb-8"
                placeholder="Example: Q1 2023 Accessibility Review"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="description" className="block text-xl font-bold">
                Description
              </label>
              <p className="text-sm text-gray-500 mb-1">
                Provide a description for this assessment.
              </p>
              <Textarea
                id="description"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                className="mt-1 block w-full mb-8"
                placeholder="Enter a detailed description of this assessment"
                rows={4}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="guidelines" className="block text-xl font-bold">
                WCAG Guidelines
              </label>
              <p className="text-sm text-gray-500 mb-1">
                Select the WCAG guidelines for this assessment.
              </p>
              <Select value={guidelines} onValueChange={setGuidelines}>
                <SelectTrigger className="w-full mb-8">
                  <SelectValue placeholder="Select WCAG guidelines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wcag 2.0 A">WCAG 2.0 A</SelectItem>
                  <SelectItem value="wcag 2.0 AA">WCAG 2.0 AA</SelectItem>
                  <SelectItem value="wcag 2.0 AAA">WCAG 2.0 AAA</SelectItem>
                  <SelectItem value="wcag 2.1 A">WCAG 2.1 A</SelectItem>
                  <SelectItem value="wcag 2.1 AA">WCAG 2.1 AA</SelectItem>
                  <SelectItem value="wcag 2.1 AAA">WCAG 2.1 AAA</SelectItem>
                  <SelectItem value="wcag 2.2 A">WCAG 2.2 A</SelectItem>
                  <SelectItem value="wcag 2.2 AA">WCAG 2.2 AA</SelectItem>
                  <SelectItem value="wcag 2.2 AAA">WCAG 2.2 AAA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mb-4">
              <label htmlFor="project" className="block text-xl font-bold">
                Projects
              </label>
              <p className="text-sm text-gray-500 mb-1">
                Optionally select one or more projects to associate with this
                assessment.
              </p>
              <MultiSelect
                id="project"
                options={projects.map((project) => ({
                  value: project.documentId?.toString() || "",
                  label: project.name,
                }))}
                selected={selectedProjectIds}
                onChangeAction={setSelectedProjectIds}
                placeholder="Select projects..."
                className="mt-1 block w-full border-input border p-2 mb-8 dark:bg-card dark:border-border"
              />
              {isLoadingProjects && (
                <p className="text-sm text-gray-500 mt-1">
                  Loading projects...
                </p>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="tags" className="block text-xl font-bold">
                Tags
              </label>
              <p className="text-sm text-gray-500 mb-1">
                Add tags to help categorize this assessment.
              </p>
              <MultiSelect
                id="tags"
                options={tags.map((tag) => ({
                  value: tag.documentId?.toString() || "",
                  label: tag.label ?? "Unnamed Tag",
                }))}
                selected={selectedTagIds}
                onChangeAction={setSelectedTagIds}
                placeholder="Select tags..."
                className="mt-1 block w-full border-input border p-2 mb-8 dark:bg-card dark:border-border"
              />
              {isLoadingTags && (
                <p className="text-sm text-gray-500 mt-1">Loading tags...</p>
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

export default AssessmentForm;
