import type {
  CreateNoteInput,
  Note,
  UpdateNoteInput,
} from "@/collections/notes";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteList } from "@/components/notes/note-list";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { baseNotesCollection, baseProjectsCollection } from "@/lib/db";
import { newId } from "@/lib/id";
import { nowIso } from "@/lib/time";
import { routes } from "@/routes/route-paths";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

export function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // Use nuqs for projectId and new query param consistency
  const [urlNew, setUrlNew] = useQueryState(
    "new",
    parseAsString.withDefault("")
  );
  const [, setUrlProjectId] = useQueryState(
    "projectId",
    parseAsString.withDefault("")
  );

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<null>(null);

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

  const handleImportNotes = useCallback(
    async (
      importedNotes: Array<Omit<Note, "id" | "createdAt" | "updatedAt">>
    ) => {
      try {
        await Promise.all(
          importedNotes.map(async (note) => {
            await baseNotesCollection.insert({
              ...note,
              id: newId(),
              createdAt: nowIso(),
              updatedAt: nowIso(),
              isArchived: note.isArchived ?? false,
              isPinned: note.isPinned ?? false,
              tagIds: note.tagIds ?? [],
            });
          })
        );
        toast.success(`Successfully imported ${importedNotes.length} notes`);
      } catch (error) {
        console.error("Error importing notes:", error);
        toast.error("Failed to import notes. Please try again.");
      }
    },
    []
  );
  useEffect(() => {
    const shouldOpen = urlNew === "1";
    if (shouldOpen) {
      setEditingNote(null);
      setIsEditorOpen(true);
      // Clear the flag to avoid reopening on re-renders
      void setUrlNew("");
    }
  }, [urlNew, setUrlNew]);

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

  // Open note editor when navigated with ?new=1 on project view

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
                // Open the local editor dialog and keep projectId in URL
                setEditingNote(null);
                setIsEditorOpen(true);
                if (projectId) void setUrlProjectId(projectId);
              }}
            >
              Add Note
            </Button>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Notes in this project</h2>
          <NoteList
            notes={notes}
            onEditNote={(id) => navigate(routes.notes.view(id))}
            onDeleteNote={() => {}}
            onTogglePin={() => {}}
            onArchiveNote={() => {}}
            onAddNote={() => {
              setEditingNote(null);
              setIsEditorOpen(true);
              if (projectId) void setUrlProjectId(projectId);
            }}
            onImportNotes={handleImportNotes}
          />
          {notes.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No notes in this project yet.
            </div>
          )}
        </div>
      </div>
      {/* Note editor dialog for creating/editing a note scoped to this project */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
          <div className="p-6">
            <NoteEditor
              note={editingNote || undefined}
              onSave={async (noteData: CreateNoteInput | UpdateNoteInput) => {
                try {
                  const now = nowIso();
                  const payload: import("@/collections/notes").CreateNoteInput =
                    {
                      title:
                        (noteData as CreateNoteInput).title ??
                        (noteData as UpdateNoteInput).title ??
                        "",
                      content:
                        (noteData as CreateNoteInput).content ??
                        (noteData as UpdateNoteInput).content ??
                        "",
                      color:
                        (noteData as CreateNoteInput).color ??
                        (noteData as UpdateNoteInput).color,
                      projectIds:
                        (noteData as CreateNoteInput).projectIds ??
                        (noteData as UpdateNoteInput).projectIds ??
                        [],
                      categoryIds:
                        (noteData as CreateNoteInput).categoryIds ??
                        (noteData as UpdateNoteInput).categoryIds ??
                        [],
                      tagIds:
                        (noteData as CreateNoteInput).tagIds ??
                        (noteData as UpdateNoteInput).tagIds ??
                        [],
                      isArchived:
                        (noteData as CreateNoteInput).isArchived ??
                        (noteData as UpdateNoteInput).isArchived ??
                        false,
                      isPinned:
                        (noteData as CreateNoteInput).isPinned ??
                        (noteData as UpdateNoteInput).isPinned ??
                        false,
                    };
                  await baseNotesCollection.insert({
                    ...payload,
                    id: newId(),
                    createdAt: now,
                    updatedAt: now,
                  } as import("@/collections/notes").Note);
                  setIsEditorOpen(false);
                  toast.success("Note created successfully!");
                } catch (err) {
                  console.error("Error creating note:", err);
                  toast.error("Failed to create note. Please try again.");
                }
              }}
              onCancel={() => {
                setIsEditorOpen(false);
                setEditingNote(null);
                // Clean up URL params (nuqs)
                void setUrlNew("");
                void setUrlProjectId("");
              }}
              initialProjectIds={projectId ? [projectId] : []}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Note: We intentionally place the NoteEditor dialog at the end of the file
// so it can access imports and state above when ProjectView is rendered.
