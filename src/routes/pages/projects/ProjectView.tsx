import { useParams } from "react-router";
import { useRef } from "react";
import { useLiveQuery, eq } from "@tanstack/react-db";
import { projectsCollection, activeNotesCollection } from "@/lib/db";
import type { Note } from "@/collections/notes";
import { NoteList } from "@/components/notes/NoteList";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { routes } from "@/routes/routePaths";

export function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const { data: [project] = [], isLoading } = useLiveQuery((q) =>
    q
      .from({ project: projectsCollection })
      .where(({ project }) => eq(project.id, projectId))
      .select(({ project }) => project)
  ) as { data: Array<{ id: string; name?: string; description?: string }>; isLoading: boolean };

  // Keep previous project to avoid flicker during background refetches
  const previousProjectRef = useRef(project ?? null);
  if (project) previousProjectRef.current = project;
  const displayProject = project ?? previousProjectRef.current;

  const { data: activeNotes = [] } = useLiveQuery(activeNotesCollection) as { data: Note[] };
  const notes: Note[] = (activeNotes || [])
    .filter((note: Note) => {
      if (!projectId) return false;
      // Only multi-project linkage; legacy single field removed
      return Array.isArray(note.projectIds) && note.projectIds.includes(projectId);
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  if (!projectId) {
    return (
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[260px] bg-[radial-gradient(60%_80%_at_50%_0%,_oklch(0.97_0_0/_0.9),_transparent_70%)] dark:bg-[radial-gradient(60%_80%_at_50%_0%,_oklch(0.25_0_0/_0.6),_transparent_70%)]"
        />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <p className="text-sm text-muted-foreground">Invalid project id.</p>
          <div className="mt-3">
            <Button variant="outline" onClick={() => navigate(routes.homeProjectsTab())}>Back to Projects</Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading only on initial mount when we have no cached data
  if (isLoading && !displayProject) {
    return (
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[260px] bg-[radial-gradient(60%_80%_at_50%_0%,_oklch(0.97_0_0/_0.9),_transparent_70%)] dark:bg-[radial-gradient(60%_80%_at_50%_0%,_oklch(0.25_0_0/_0.6),_transparent_70%)]"
        />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <p className="text-sm text-muted-foreground">Loading project…</p>
        </div>
      </div>
    );
  }

  if (!displayProject) {
    return (
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[260px] bg-[radial-gradient(60%_80%_at_50%_0%,_oklch(0.97_0_0/_0.9),_transparent_70%)] dark:bg-[radial-gradient(60%_80%_at_50%_0%,_oklch(0.25_0_0/_0.6),_transparent_70%)]"
        />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <p className="text-sm text-muted-foreground">Project not found.</p>
          <div className="mt-3">
            <Button variant="outline" onClick={() => navigate(routes.homeProjectsTab())}>Back to Projects</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[260px] bg-[radial-gradient(60%_80%_at_50%_0%,_oklch(0.97_0_0/_0.9),_transparent_70%)] dark:bg-[radial-gradient(60%_80%_at_50%_0%,_oklch(0.25_0_0/_0.6),_transparent_70%)]"
      />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{displayProject?.name || 'Project'}</h1>
          {displayProject?.description && (
            <p className="text-muted-foreground">{displayProject.description}</p>
          )}
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate(routes.homeProjectsTab())}>
            Back to Projects
          </Button>
          <Button onClick={() => navigate(routes.notes.newWithProject(projectId ?? ''))}>
            Add Note
          </Button>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Notes in this project</h2>
        {notes.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No notes in this project yet.
          </div>
        ) : (
          <NoteList 
            notes={notes} 
            onEditNote={(id) => navigate(routes.notes.view(id))}
            onDeleteNote={() => {}}
            onTogglePin={() => {}}
            onArchiveNote={() => {}}
            onAddNote={() => navigate(routes.notes.newWithProject(projectId ?? ''))}
            onImportNotes={() => {}}
          />
        )}
      </div>
      </div>
    </div>
  );
}
