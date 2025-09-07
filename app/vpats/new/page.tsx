"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ErrorAlert from "@/components/ui/error-alert";
import { normalizeErrorMessage } from "@/lib/errors";
import { projectsApi } from "@/lib/api";
import { vpatsApi } from "@/lib/api/vpats";
import type { UUID } from "@/types/common";
import type { Project } from "@/types/project";

export default function CreateVpatPage() {
  const router = useRouter();
  const params = useSearchParams();

  // Prefill from query if provided
  const prefillProjectId = (params.get("projectId") as UUID | null) ?? null;

  const [projectId, setProjectId] = useState<UUID | null>(prefillProjectId);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Projects list for selector (reuses ProjectsApiService)
  const { data: projectsResp, isLoading: isProjectsLoading, error: projectsError } = useQuery({
    queryKey: ["projects", { sortBy: "name", sortOrder: "asc" }],
    queryFn: async () => {
      const res = await projectsApi.getProjects({ sortBy: "name", sortOrder: "asc" });
      if (!res.success) throw new Error(res.error || "Failed to load projects");
      return res.data;
    },
  });

  const projects: Project[] = useMemo(() => projectsResp?.data ?? [], [projectsResp]);

  const projectValid = !!projectId;
  const titleValid = title.trim().length > 0;
  const isValid = projectValid && titleValid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!isValid) {
      setSubmitError("Please select a project and enter a title.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await vpatsApi.create({
        projectId: projectId as UUID,
        title: title.trim(),
        description: description || undefined,
      });
      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to create VPAT");
      }
      // Redirect to the editor skeleton page for this vpat
      router.replace(`/vpats/${res.data.id}`);
    } catch (err) {
      setSubmitError(normalizeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Create VPAT</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {submitError && <ErrorAlert variant="banner" message={submitError} />}

        <div className="space-y-2">
          <Label htmlFor="project">Project</Label>
          <div className="flex items-center gap-2">
            <Select
              value={projectId ?? undefined}
              onValueChange={(val) => setProjectId(val as UUID)}
              disabled={isProjectsLoading}
           >
              <SelectTrigger className="min-w-[16rem]">
                <SelectValue placeholder={isProjectsLoading ? "Loading projects…" : "Select a project"} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {projectsError && (
              <span className="text-sm text-red-700">{normalizeErrorMessage(projectsError)}</span>
            )}
          </div>
          {!projectValid && (
            <p className="text-sm text-red-700" role="alert">
              Project is required.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={!titleValid}
            placeholder="e.g., ACME Widget VPAT"
          />
          {!titleValid && (
            <p className="text-sm text-red-700" role="alert">
              Title is required.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional: brief description shown on list/cards"
          />
        </div>

        <div className="pt-2 flex items-center gap-3">
          <Button type="submit" disabled={!isValid || isSubmitting}>
            {isSubmitting ? "Creating…" : "Create VPAT"}
          </Button>
        </div>
      </form>
    </div>
  );
}
