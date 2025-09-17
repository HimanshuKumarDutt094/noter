import { type Note } from "@/collections/notes";
import {
  MoveNoteDialog,
  type MoveNotePayload,
} from "@/components/notes/move-note-dialog";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteList } from "@/components/notes/note-list";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { baseNotesCollection } from "@/lib/db";
import { newId } from "@/lib/id";
import { nowIso } from "@/lib/time";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

export function NotesPage() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery] = useState("");
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [moveNote, setMoveNote] = useState<Note | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Page size for incremental loading
  const PAGE_SIZE = 50;
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Use live query to get non-archived notes with an adjustable limit (infinite scroll)
  const { data: allNotes = [], isLoading } = useLiveQuery((q) =>
    q
      .from({ note: baseNotesCollection })
      .where(({ note }) => eq(note.isArchived, false))
      .orderBy(({ note }) => note.updatedAt, "desc")
      .limit(limit)
  ) as unknown as { data: Note[]; isLoading?: boolean };

  // Sentinel for IntersectionObserver to load more
  const sentinelRef = useState<HTMLDivElement | null>(null);
  const [sentinel, setSentinel] = sentinelRef;

  useEffect(() => {
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setLimit((prev) => prev + PAGE_SIZE);
          }
        });
      },
      { root: null, rootMargin: "200px", threshold: 0.1 }
    );

    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [sentinel]);

  // Filter notes based on search query
  const notes = allNotes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.tagIds &&
        note.tagIds.some((tagId: string) =>
          tagId.toLowerCase().includes(searchQuery.toLowerCase())
        ))
  );

  // Notes are filtered by pinned status in the NoteList component

  // Create a new note
  const handleCreateNote = useCallback(
    async (noteData: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
      try {
        const newNote: Note = {
          ...noteData,
          id: newId(),
          createdAt: nowIso(),
          updatedAt: nowIso(),
          isArchived: false,
          isPinned: false,
          // Ensure arrays are always present and preferred over legacy single fields
          projectIds:
            (noteData as Partial<Note>).projectIds &&
            Array.isArray((noteData as Partial<Note>).projectIds)
              ? ((noteData as Partial<Note>).projectIds as string[])
              : (noteData as Partial<Note>).projectId
              ? [(noteData as Partial<Note>).projectId as string]
              : [],
          categoryIds:
            (noteData as Partial<Note>).categoryIds &&
            Array.isArray((noteData as Partial<Note>).categoryIds)
              ? ((noteData as Partial<Note>).categoryIds as string[])
              : (noteData as Partial<Note>).categoryId
              ? [(noteData as Partial<Note>).categoryId as string]
              : [],
          tagIds: noteData.tagIds ?? [],
        };

        await baseNotesCollection.insert(newNote);
        setIsEditorOpen(false);
        toast.success("Note created successfully!");
      } catch (error) {
        console.error("Error creating note:", error);
        toast.error("Failed to create note. Please try again.");
      }
    },
    []
  );

  // If navigated with ?new=1, open editor and prefill project from query
  useEffect(() => {
    const shouldOpen = searchParams.get("new") === "1";
    if (shouldOpen) {
      setEditingNote(null);
      setIsEditorOpen(true);
      // Clear the flag to prevent reopening on re-renders
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          sp.delete("new");
          return sp;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams]);

  // If navigated with ?edit=<id>, open editor for that note
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId) {
      const found = (allNotes as Note[]).find((n) => n.id === editId) || null;
      setEditingNote(found);
      setIsEditorOpen(true);
      // Clear the flag to prevent reopening on re-renders
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          sp.delete("edit");
          return sp;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams, allNotes]);

  // Update an existing note
  const handleUpdateNote = useCallback(async (note: Note) => {
    try {
      await baseNotesCollection.update(note.id, (draft) => {
        Object.assign(draft, {
          ...note,
          updatedAt: nowIso(),
        });
        // Ensure arrays are present post-merge (in case callers passed legacy fields)
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
        await baseNotesCollection.insert({
          ...original,
          id: newId(),
          title: original.title
            ? `${original.title} (Copy)`
            : "Untitled Note (Copy)",
          createdAt: now,
          updatedAt: now,
        });
        toast.success("Note cloned");
      } catch (error) {
        console.error("Error cloning note:", error);
        toast.error("Failed to clone note. Please try again.");
      }
    },
    [notes]
  );

  // Toggle pin status
  const handleTogglePin = useCallback(
    async (id: string) => {
      try {
        const note = notes.find((n) => n.id === id);
        if (!note) return;

        await baseNotesCollection.update(id, (draft) => {
          draft.isPinned = !draft.isPinned;
          draft.updatedAt = nowIso();
        });

        toast.success(note.isPinned ? "Note unpinned" : "Note pinned");
      } catch (error) {
        console.error("Error toggling pin status:", error);
        toast.error("Failed to update note. Please try again.");
      }
    },
    [notes]
  );

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
          // Update existing note
          const updatedNote: Note = {
            ...editingNote,
            ...noteData,
            updatedAt: nowIso(),
            // Ensure arrays and required fields are always present
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
          // Create new note with required fields
          const newNote: Omit<Note, "id" | "createdAt" | "updatedAt"> = {
            title: noteData.title!,
            content: noteData.content!,
            color: noteData.color,
            // Prefer arrays; gracefully accept legacy single fields
            projectIds: Array.isArray(noteData.projectIds)
              ? (noteData.projectIds as string[])
              : noteData.projectId
              ? [noteData.projectId]
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

          await handleCreateNote(newNote);
        }
      } catch (error) {
        console.error("Error saving note:", error);
        toast.error("Failed to save note. Please try again.");
      }
    },
    [editingNote, handleUpdateNote, handleCreateNote]
  );

  const handleEditNote = useCallback(
    (id: string) => {
      const noteToEdit = notes.find((n) => n.id === id);
      if (noteToEdit) {
        setEditingNote(noteToEdit);
        setIsEditorOpen(true);
      }
    },
    [notes]
  );

  const handleImportNotes = useCallback(
    async (
      importedNotes: Array<Omit<Note, "id" | "createdAt" | "updatedAt">>
    ) => {
      try {
        await Promise.all(
          importedNotes.map((note) =>
            baseNotesCollection.insert({
              ...note,
              id: newId(),
              createdAt: nowIso(),
              updatedAt: nowIso(),
              isArchived: note.isArchived ?? false,
              isPinned: note.isPinned ?? false,
              tagIds: note.tagIds ?? [],
            })
          )
        );
        toast.success(`Successfully imported ${importedNotes.length} notes`);
      } catch (error) {
        console.error("Error importing notes:", error);
        toast.error("Failed to import notes. Please try again.");
      }
    },
    []
  );

  // Local-first: avoid blocking loaders; render immediately with current data

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <NoteList
        notes={notes}
        isLoading={Boolean(isLoading)}
        onAddNote={() => {
          setEditingNote(null);
          setIsEditorOpen(true);
        }}
        onEditNote={handleEditNote}
        onDeleteNote={handleDeleteNote}
        onTogglePin={handleTogglePin}
        onArchiveNote={handleArchiveNote}
        onCloneNote={handleCloneNote}
        onMoveNote={handleOpenMove}
        onImportNotes={handleImportNotes}
      />

      {/* Invisible sentinel element for infinite scroll */}
      <div ref={setSentinel} />

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
          <div className="p-6">
            <NoteEditor
              note={editingNote || undefined}
              onSave={handleSaveNote}
              onCancel={() => {
                setIsEditorOpen(false);
                setEditingNote(null);
                // Clear edit/new params if present
                setSearchParams(
                  (prev) => {
                    const sp = new URLSearchParams(prev);
                    sp.delete("edit");
                    sp.delete("new");
                    return sp;
                  },
                  { replace: true }
                );
              }}
              initialProjectIds={(() => {
                const pid = searchParams.get("projectId");
                return pid ? [pid] : [];
              })()}
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
