import type { Project } from "@/collections/projects";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type ProjectCardProps = {
  project: Project;
  noteCount?: number;
  onClick?: (projectId: string) => void;
};

export function ProjectCard({ project, noteCount = 0, onClick }: ProjectCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition" onClick={() => onClick?.(project.id)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {project.color && (
              <span
                className="inline-block h-3 w-3 rounded-full border"
                style={{ backgroundColor: project.color }}
                aria-hidden
              />
            )}
            <CardTitle className="text-base">{project.name}</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">{new Date(project.createdAt).toLocaleDateString()}</span>
        </div>
        {project.excerpt && (
          <CardDescription>{project.excerpt}</CardDescription>
        )}
        <div className="text-xs text-muted-foreground">{noteCount} notes</div>
      </CardHeader>
    </Card>
  );
}
