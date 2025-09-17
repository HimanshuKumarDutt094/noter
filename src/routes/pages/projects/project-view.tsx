import type { Note } from "@/collections/notes";
import { NoteList } from "@/components/notes/note-list";
import { Button } from "@/components/ui/button";
import { baseNotesCollection, baseProjectsCollection } from "@/lib/db";
import { routes } from "@/routes/route-paths";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

export function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  const { data: [project] = [], isLoading } = useLiveQuery((q) =>
    q
      .from({ project: baseProjectsCollection })
      .where(({ project }) => eq(project.id, projectId))
      .select(({ project }) => project)
  ) as unknown as {
    data: Array<{ id: string; name?: string; description?: string }>;
    isLoading: boolean;
  };

  // Keep previous project to avoid flicker during background refetches
  const previousProjectRef = useRef(project ?? null);
  if (project) previousProjectRef.current = project;
  const displayProject = project ?? previousProjectRef.current;

  const { data: activeNotes = [] } = useLiveQuery((q) =>
    q
      .from({ note: baseNotesCollection })
      .where(({ note }) => eq(note.isArchived, false))
      .orderBy(({ note }) => note.updatedAt, "desc")
  ) as unknown as {
    data: Note[];
  };
  const notes: Note[] = (activeNotes || [])
    .filter((note: Note) => {
      if (!projectId) return false;
      // Only multi-project linkage; legacy single field removed
      return (
        Array.isArray(note.projectIds) && note.projectIds.includes(projectId)
      );
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
            <Button
              variant="outline"
              onClick={() => navigate(routes.homeProjectsTab())}
            >
              Back to Projects
            </Button>
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
            <Button
              variant="outline"
              onClick={() => navigate(routes.homeProjectsTab())}
            >
              Back to Projects
            </Button>
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
            <h1 className="text-2xl font-bold">
              {displayProject?.name || "Project"}
            </h1>
            {displayProject?.description && (
              <p className="text-muted-foreground">
                {displayProject.description}
              </p>
            )}
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={() => navigate(routes.homeProjectsTab())}
            >
              Back to Projects
            </Button>
            <Button
              onClick={() => {
                // Set the new note query param on the current location so we
                // don't navigate away from the projects view. Keep projectId
                // in query so the notes editor will prefill the project.
                setSearchParams((prev) => {
                  const sp = new URLSearchParams(prev);
                  sp.set("new", "1");
                  if (projectId) sp.set("projectId", projectId);
                  return sp;
                });
              }}
            >
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
              onAddNote={() => {
                setSearchParams((prev) => {
                  const sp = new URLSearchParams(prev);
                  sp.set("new", "1");
                  if (projectId) sp.set("projectId", projectId);
                  return sp;
                });
              }}
              onImportNotes={() => {}}
            />
          )}
        </div>
      </div>
    </div>
  );
}
