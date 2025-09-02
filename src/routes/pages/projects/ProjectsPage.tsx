import { useState, useMemo } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { projectsCollection, activeNotesCollection } from "@/lib/db";
import type { Project } from "@/collections/projects";
import type { CreateProjectInput } from "@/collections/projects";
import type { Note } from "@/collections/notes";
import { Input } from "@/components/ui/input";
import { filterNotes } from "@/lib/filters";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/useProjects";
import { ProjectsList } from "@/components/projects/ProjectsList";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { useNavigate } from "react-router";
import { routes } from "@/routes/routePaths";

export function ProjectsPage() {
  const navigate = useNavigate();
  const { data: projects = [] } = useLiveQuery(projectsCollection) as {
    data: Project[];
  };
  const { data: allNotes = [] } = useLiveQuery(activeNotesCollection) as {
    data: Note[];
  };
  const { createProject } = useProjects();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
    );
  }, [projects, search]);

  // notes are filtered in ProjectNotesPanel

  const hasNotes = allNotes.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className={hasNotes ? "lg:col-span-12 xl:col-span-12 space-y-4" : "lg:col-span-5 xl:col-span-4 space-y-4"}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Projects</h2>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            New Project
          </Button>
        </div>
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10"
        />
        <ProjectsList
          projects={filteredProjects}
          getNoteCount={(id) =>
            filterNotes(allNotes, { projectIds: [id] }).length
          }
          onSelectProject={(id) => navigate(routes.projects.view(id))}
        />
        <ProjectDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={async (values: CreateProjectInput) => {
            await createProject(values);
          }}
          title="New Project"
        />
      </div>
      {!hasNotes && (
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="h-full flex items-center justify-center text-muted-foreground border rounded-md p-8">
            Select a project to view its notes
          </div>
        </div>
      )}
    </div>
  );
}
