import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { MultiSelect } from "@/components/ui/multi-select";
import { X, SaveIcon } from "lucide-react";
import { getAllTags } from "@/data/services/tag-service";
import { Tag } from "@/types/tag";
import { Project } from "@/types/project";
import { Assessment } from "@/types/assessment";

// Props for the ProjectForm component
interface ProjectFormProps {
  project?: Project; // Optional project for editing
  onSubmit: (project: {
    name: string;
    description: string | undefined;
    assessments: string[];
    tags: string[];
  }) => Promise<void>;
  onDelete?: (documentId: string) => Promise<void>; // Optional delete handler
  onCancel: () => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  project,
  onSubmit,
  onDelete,
  onCancel,
}) => {
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Assessment state
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>(
    [],
  );
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(false);

  // Tag state
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);

  // Fetch assessments and tags
  useEffect(() => {
    const fetchAssessments = async () => {
      setIsLoadingAssessments(true);
      try {
        const response = await axios.get("/api/assessments");
        setAllAssessments(response.data);
      } catch (err) {
        console.error("Error fetching assessments:", err);
        setError("Failed to load assessments. Please try again.");
      } finally {
        setIsLoadingAssessments(false);
      }
    };

    const fetchTags = async () => {
      setIsLoadingTags(true);
      try {
        const fetchedTags = await getAllTags();
        setTags(fetchedTags);
      } catch (err) {
        console.error("Error fetching tags:", err);
        setError("Failed to load tags. Please try again.");
      } finally {
        setIsLoadingTags(false);
      }
    };

    fetchAssessments();
    fetchTags();
  }, []);

  // Initialize form with project data if editing
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || "");

      // Set selected tag IDs if project has tags
      if (project.tags && project.tags.length > 0) {
        setSelectedTagIds(
          project.tags.map((tag) => {
            return typeof tag === "string" ? tag : tag.documentId.toString();
          }),
        );
      }

      // Set selected assessment IDs if project has assessments
      if (project.assessments && project.assessments.length > 0) {
        setSelectedAssessmentIds(
          project.assessments.map((assessment) => {
            return typeof assessment === "string"
              ? assessment
              : assessment.documentId.toString();
          }),
        );
      }
    }
  }, [project]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await onSubmit({
        name,
        description: description || undefined,
        assessments: selectedAssessmentIds || [],
        tags: selectedTagIds || [],
      });
    } catch (err) {
      setError("Failed to save project. Please try again.");
      console.error("Error submitting project:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show delete confirmation modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Handle project deletion after confirmation
  const handleDelete = async () => {
    if (!project || !onDelete || !project.documentId) return;

    setIsSubmitting(true);
    try {
      await onDelete(project.documentId);
    } catch (err) {
      setError("Failed to delete project. Please try again.");
      console.error("Error deleting project:", err);
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        {project ? "Edit Project" : "Create New Project"}
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
                Provide a name for this project.
              </p>
              <Input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full mb-8"
                placeholder="Example: Marketing Website"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="description" className="block text-xl font-bold">
                Description
              </label>
              <p className="text-sm text-gray-500 mb-1">
                Provide a description for this project.
              </p>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full mb-8"
                placeholder="Example: The company's main marketing website"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="tags" className="block text-xl font-bold">
                Tags
              </label>
              <p className="text-sm text-gray-500 mb-1">
                Add tags to help categorize this project.
              </p>
              <MultiSelect
                id="tags"
                options={tags.map((tag) => ({
                  value: tag.documentId,
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

            <div className="mb-4">
              <label htmlFor="assessments" className="block text-xl font-bold">
                Assessments
              </label>
              <p className="text-sm text-gray-500 mb-1">
                Select assessments to associate with this project.
              </p>
              <MultiSelect
                id="assessments"
                options={allAssessments.map((assessment) => ({
                  value: assessment.documentId,
                  label: assessment.name ?? "Unnamed Assessment",
                }))}
                selected={selectedAssessmentIds}
                onChangeAction={setSelectedAssessmentIds}
                placeholder="Select assessments..."
                className="mt-1 block w-full border-input border p-2 mb-8 dark:bg-card dark:border-border"
              />
              {isLoadingAssessments && (
                <p className="text-sm text-gray-500 mt-1">
                  Loading assessments...
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Confirm Deletion"
        message="Are you sure you want to delete this project? This action cannot be undone."
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
      />
    </div>
  );
};

export default ProjectForm;
