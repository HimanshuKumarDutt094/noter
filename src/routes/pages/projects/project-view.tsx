import type { Note } from "@/collections/notes";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteList } from "@/components/notes/note-list";
import {
  MoveNoteDialog,
  type MoveNotePayload,
} from "@/components/notes/move-note-dialog";
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
  // Support opening the editor via ?edit=<id> just like the notes page
  const [urlEdit, setUrlEdit] = useQueryState(
    "edit",
    parseAsString.withDefault("")
  );

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<
    import("@/collections/notes").Note | null
  >(null);

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
  // Split pinned vs other notes and scope to project
  const pinnedNotes: Note[] = (activeNotes || [])
    .filter((note: Note) => {
      if (!projectId) return false;
      return (
        note.isPinned &&
        Array.isArray(note.projectIds) &&
        note.projectIds.includes(projectId)
      );
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const notes: Note[] = (activeNotes || [])
    .filter((note: Note) => {
      if (!projectId) return false;
      return (
        !note.isPinned &&
        Array.isArray(note.projectIds) &&
        note.projectIds.includes(projectId)
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
  // Create a new note (scoped to this project by default)
  const handleCreateNote = useCallback(
    async (noteData: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
      try {
        const now = nowIso();
        const newNote: Note = {
          ...noteData,
          id: newId(),
          createdAt: now,
          updatedAt: now,
          isArchived: false,
          isPinned: false,
          projectIds: Array.isArray(noteData.projectIds)
            ? noteData.projectIds
            : projectId
            ? [projectId]
            : [],
          categoryIds: Array.isArray(noteData.categoryIds)
            ? noteData.categoryIds
            : noteData.categoryId
            ? [noteData.categoryId]
            : [],
          tagIds: noteData.tagIds ?? [],
        } as Note;

        baseNotesCollection.insert(newNote);
        setIsEditorOpen(false);
        toast.success("Note created successfully!");
      } catch (error) {
        console.error("Error creating note:", error);
        toast.error("Failed to create note. Please try again.");
      }
    },
    [projectId]
  );

  // Update an existing note
  const handleUpdateNote = useCallback(async (note: Note) => {
    try {
      await baseNotesCollection.update(note.id, (draft) => {
        Object.assign(draft, {
          ...note,
          updatedAt: nowIso(),
        });
        draft.projectIds = Array.isArray(note.projectIds)
          ? note.projectIds
          : note.projectId
          ? [note.projectId]
          : draft.projectIds ?? [];
        draft.categoryIds = Array.isArray(note.categoryIds)
          ? note.categoryIds
          : note.categoryId
          ? [note.categoryId]
          : draft.categoryIds ?? [];
        draft.tagIds = Array.isArray(note.tagIds)
          ? note.tagIds
          : draft.tagIds ?? [];
      });

      setIsEditorOpen(false);
      setEditingNote(null);
      toast.success("Note updated successfully!");
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Failed to update note. Please try again.");
    }
  }, []);

  // Delete a note
  const handleDeleteNote = useCallback(async (id: string) => {
    try {
      await baseNotesCollection.delete(id);
      toast.success("Note moved to trash");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note. Please try again.");
    }
  }, []);

  // Open Move dialog
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [moveNote, setMoveNote] = useState<Note | null>(null);

  const handleOpenMove = useCallback(
    (id: string) => {
      const n = notes.find((x) => x.id === id) || null;
      setMoveNote(n);
      setIsMoveOpen(!!n);
    },
    [notes]
  );

  // Apply Move
  const handleMoveNote = useCallback(
    async ({
      noteId,
      projectIds,
      keepCategories,
      keepTags,
    }: MoveNotePayload) => {
      try {
        await baseNotesCollection.update(noteId, (draft) => {
          draft.projectIds = Array.isArray(projectIds) ? projectIds : [];
          if (!keepCategories) draft.categoryIds = [];
          if (!keepTags) draft.tagIds = [];
          draft.updatedAt = nowIso();
        });
        toast.success("Note moved");
      } catch (error) {
        console.error("Error moving note:", error);
        toast.error("Failed to move note. Please try again.");
      } finally {
        setIsMoveOpen(false);
        setMoveNote(null);
      }
    },
    []
  );

  // Clone a note
  const handleCloneNote = useCallback(
    async (id: string) => {
      try {
        const original = notes.find((n) => n.id === id);
        if (!original) return;
        const now = nowIso();

        const { ...clean } = original;

        const newIdVal = newId();
        baseNotesCollection.insert({
          ...clean,
          id: newIdVal,
          title: original.title
            ? `${original.title} (Copy)`
            : "Untitled Note (Copy)",
          createdAt: now,
          updatedAt: now,
        });

        const utilsAny = baseNotesCollection.utils as unknown as
          | {
              awaitIds?: (
                ids: Array<string | number>,
                timeoutMs?: number
              ) => Promise<void>;
            }
          | undefined;
        if (utilsAny?.awaitIds) await utilsAny.awaitIds([newIdVal]);

        toast.success("Note cloned");
      } catch (error) {
        console.error("Error cloning note:", error);
        toast.error("Failed to clone note. Please try again.");
      }
    },
    [notes]
  );

  // Toggle pin status
  const handleTogglePin = useCallback(async (id: string) => {
    try {
      await baseNotesCollection.update(id, (draft) => {
        draft.isPinned = !draft.isPinned;
        draft.updatedAt = nowIso();
      });
      toast.success("Note updated");
    } catch (error) {
      console.error("Error toggling pin status:", error);
      toast.error("Failed to update note. Please try again.");
    }
  }, []);

  // Archive a note
  const handleArchiveNote = useCallback(async (id: string) => {
    try {
      await baseNotesCollection.update(id, (draft) => {
        draft.isArchived = true;
        draft.updatedAt = nowIso();
      });

      toast.success("Note archived");
    } catch (error) {
      console.error("Error archiving note:", error);
      toast.error("Failed to archive note. Please try again.");
    }
  }, []);

  const handleSaveNote = useCallback(
    async (noteData: Partial<Note>) => {
      if (!noteData.title || !noteData.content) {
        toast.error("Title and content are required");
        return;
      }

      try {
        if (editingNote) {
          const updatedNote: Note = {
            ...editingNote,
            ...noteData,
            updatedAt: nowIso(),
            tagIds: noteData.tagIds ?? editingNote.tagIds ?? [],
            projectIds:
              noteData.projectIds && Array.isArray(noteData.projectIds)
                ? (noteData.projectIds as string[])
                : noteData.projectId
                ? [noteData.projectId]
                : editingNote.projectIds ??
                  (editingNote.projectId ? [editingNote.projectId] : []),
            categoryIds:
              noteData.categoryIds && Array.isArray(noteData.categoryIds)
                ? (noteData.categoryIds as string[])
                : noteData.categoryId
                ? [noteData.categoryId]
                : editingNote.categoryIds ??
                  (editingNote.categoryId ? [editingNote.categoryId] : []),
            isArchived: noteData.isArchived ?? editingNote.isArchived,
            isPinned: noteData.isPinned ?? editingNote.isPinned,
          } as Note;
          await handleUpdateNote(updatedNote);
        } else {
          const newNote: Omit<Note, "id" | "createdAt" | "updatedAt"> = {
            title: noteData.title!,
            content: noteData.content!,
            color: noteData.color,
            projectIds: Array.isArray(noteData.projectIds)
              ? (noteData.projectIds as string[])
              : noteData.projectId
              ? [noteData.projectId]
              : projectId
              ? [projectId]
              : [],
            categoryIds: Array.isArray(noteData.categoryIds)
              ? (noteData.categoryIds as string[])
              : noteData.categoryId
              ? [noteData.categoryId]
              : [],
            tagIds: noteData.tagIds ?? [],
            isArchived: false,
            isPinned: false,
          };

          await handleCreateNote(newNote as Note);
        }
      } catch (error) {
        console.error("Error saving note:", error);
        toast.error("Failed to save note. Please try again.");
      }
    },
    [editingNote, handleUpdateNote, handleCreateNote, projectId]
  );
  // Immediately open editor and set editing note when edit is clicked
  const handleEditNote = useCallback(
    (id: string) => {
      const noteToEdit = [...notes, ...pinnedNotes].find((n) => n.id === id);
      if (noteToEdit) {
        setEditingNote(noteToEdit);
        setIsEditorOpen(true);
      }
      // Keep URL in sync for deep-links
      void setUrlEdit(id);
    },
    [notes, pinnedNotes, setUrlEdit]
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

  // Keep the `projectId` query param set while on this view so child
  // components like `NoteList` can use it (for imports, deep-links, etc.)
  useEffect(() => {
    if (projectId) {
      void setUrlProjectId(projectId);
    }
    return () => {
      // Clear when leaving the view
      void setUrlProjectId("");
    };
  }, [projectId, setUrlProjectId]);

  // Open editor when navigated with ?edit=<id> on project view
  useEffect(() => {
    if (!urlEdit) return;
    const found =
      [...notes, ...pinnedNotes].find((n) => n.id === urlEdit) || null;
    if (found) {
      setEditingNote(found);
      setIsEditorOpen(true);
      // Clear the flag to avoid reopening on re-renders
      void setUrlEdit("");
    }
  }, [urlEdit, setUrlEdit, notes, pinnedNotes]);

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
            pinnedNotes={pinnedNotes}
            onEditNote={handleEditNote}
            onDeleteNote={handleDeleteNote}
            onTogglePin={handleTogglePin}
            onArchiveNote={handleArchiveNote}
            onCloneNote={handleCloneNote}
            onMoveNote={handleOpenMove}
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
              onSave={handleSaveNote}
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
      <MoveNoteDialog
        open={isMoveOpen}
        onOpenChange={(open) => {
          setIsMoveOpen(open);
          if (!open) setMoveNote(null);
        }}
        note={moveNote}
        onMove={handleMoveNote}
      />
    </div>
  );
}

// Note: We intentionally place the NoteEditor dialog at the end of the file
// so it can access imports and state above when ProjectView is rendered.
