import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Project } from "@/types/project";

// ProjectList component props
interface ProjectListProps {
  projects: Project[];
}

/**
 * Renders a grid of project cards
 */
export function ProjectList({ projects }: ProjectListProps) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      data-testid="projects-grid"
    >
      {projects.map((project) => (
        <div
          key={project.id}
          className="bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-border"
          data-testid={`project-card-${project.id}`}
        >
          <Link href={`/projects/${project.id}`} className="block">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-semibold mb-2">{project.name}</h2>
              </div>

              {project.description && (
                <p className="text-foreground mb-4 text-sm leading-relaxed">
                  {project.description}
                </p>
              )}

              {project.tags && project.tags.length > 0 && (
                <div className="mt-2 border-t border-border pt-4">
                  <p className="text-sm font-medium mb-1">Tags:</p>
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
              )}
              {!project.tags ||
                (project.tags.length === 0 && (
                  <div className="mt-2 border-t border-border pt-4">
                    <p className="text-sm font-medium mb-1">Tags:</p>
                    None
                  </div>
                ))}
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}

export default ProjectList;
