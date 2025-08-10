"use client";
import React, { useEffect, useState } from "react";
import { projectsApi } from "@/lib/api";
import { Project } from "@/types/project";
import {
  LoadingIndicator,
  EmptyState,
  ErrorMessage,
} from "@/components/custom/projects/common";
import ProjectList from "@/components/custom/projects/ProjectList";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

function Page() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch user's projects using the API service
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await projectsApi.getProjects({
        sortBy: "created_at",
        sortOrder: "desc",
      });

      if (response.success && response.data) {
        console.log("API response:", response);
        setProjects(response.data.data || []);
      } else {
        throw new Error(response.error || "Failed to fetch projects");
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Fetch projects when component mounts
  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 min-h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <div className="flex gap-2">
          {
            <Button
              onClick={() => console.log("add project")}
              className="px-4 py-2 bg-success dark:bg-success"
              data-testid="create-project-button"
            >
              Create Project <PlusIcon className="ml-2" />
            </Button>
          }
        </div>
      </div>

      {/* Error message */}
      <ErrorMessage message={error} />

      {/* Projects list - only show when form is not displayed */}
      {loading ? (
        <LoadingIndicator />
      ) : projects.length === 0 ? (
        <EmptyState />
      ) : (
        <ProjectList projects={projects} />
      )}
    </div>
  );
}

export default Page;
