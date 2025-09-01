import { useState, useMemo } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { projectsCollection, activeNotesCollection, baseNotesCollection } from "@/lib/db";
import type { Project } from "@/collections/projects";
import type { Note } from "@/collections/notes";
import { Input } from "@/components/ui/input";
import { filterNotes } from "@/lib/filters";
import { Button } from "@/components/ui/button";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { useProjects } from "@/hooks/useProjects";
import { ProjectsList } from "@/components/projects/ProjectsList";
import { ProjectNotesPanel } from "@/components/projects/ProjectNotesPanel";

export function ProjectsPage() {
  const { data: projects = [] } = useLiveQuery(projectsCollection) as { data: Project[] };
  const { data: allNotes = [] } = useLiveQuery(activeNotesCollection) as { data: Note[] };
  const { createProject } = useProjects();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(p => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q));
  }, [projects, search]);

  // notes are filtered in ProjectNotesPanel

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 xl:col-span-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Projects</h2>
          <Button size="sm" onClick={() => setDialogOpen(true)}>New Project</Button>
        </div>
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10"
        />
        <ProjectsList
          projects={filteredProjects}
          getNoteCount={(id) => filterNotes(allNotes, { projectIds: [id] }).length}
          onSelectProject={setSelectedProjectId}
        />
        <ProjectDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={async (values) => { await createProject(values); }}
          title="New Project"
        />
      </div>
      <div className="lg:col-span-7 xl:col-span-8">
        {selectedProjectId ? (
          <ProjectNotesPanel
            allNotes={allNotes}
            filter={{ projectIds: [selectedProjectId] }}
            onAddNote={() => { /* handled via Home Notes tab create */ }}
            onEditNote={(id) => { void id; /* open editor from Notes tab; placeholder */ }}
            onDeleteNote={async (id) => { await baseNotesCollection.delete(id); }}
            onTogglePin={async (id) => { await baseNotesCollection.update(id, d => { d.isPinned = !d.isPinned; d.updatedAt = new Date().toISOString(); }); }}
            onArchiveNote={async (id) => { await baseNotesCollection.update(id, d => { d.isArchived = true; d.updatedAt = new Date().toISOString(); }); }}
            onImportNotes={(_notes) => { void _notes; /* import handled globally in Notes tab */ }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground border rounded-md p-8">
            Select a project to view its notes
          </div>
        )}
      </div>
    </div>
  );
}
