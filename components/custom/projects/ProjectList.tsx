import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Project } from "@/types/project";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ProjectList component props
interface ProjectListProps {
  projects: Project[];
}

function DescriptionFirstLine({ text }: { text?: string | null }) {
  if (!text) return <span className="text-muted-foreground">—</span>;
  const firstLine = text.split("\n")[0]?.trim();
  return <span className="text-muted-foreground">{firstLine || "—"}</span>;
}

/**
 * Renders a grid of project cards using the shared Card component (parity with VPAT list)
 */
export function ProjectList({ projects }: ProjectListProps) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      data-testid="projects-grid"
    >
      {projects.map((project) => (
        <Link key={project.id} href={`/projects/${project.id}`}>
          <Card
            className="h-full shadow-md"
            data-testid={`project-card-${project.id}`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{project.name}</CardTitle>
              <CardDescription>
                <DescriptionFirstLine text={project.description ?? null} />
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              {project.tags && project.tags.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <div className="text-sm font-medium mb-1">Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                      >
                        {tag.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tags</span>
                  <span className="text-muted-foreground">—</span>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default ProjectList;
