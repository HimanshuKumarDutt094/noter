import type { Project } from "@/collections/projects";
import { ProjectCard } from "@/components/projects/ProjectCard";

export type ProjectsListProps = {
  projects: readonly Project[];
  getNoteCount: (projectId: string) => number;
  onSelectProject?: (projectId: string) => void;
};

export function ProjectsList({ projects, getNoteCount, onSelectProject }: ProjectsListProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {projects.map((p) => (
        <ProjectCard
          key={p.id}
          project={p}
          noteCount={getNoteCount(p.id)}
          onClick={onSelectProject}
        />)
      )}
    </div>
  );
}
