import { useCallback } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { notesCollection, pinnedNotes } from "@/lib/db";
import type { Note } from "@/lib/db";
import { formatDateForNote } from "@/collections/notes";
import { v7 } from "uuid";

export function useNotes(projectId?: string) {
  const notesQuery = useLiveQuery(notesCollection);
  const pinnedQuery = useLiveQuery(pinnedNotes);

  const { data: allNotes = [], isLoading } = notesQuery;
  const { data: allPinned = [] } = pinnedQuery;

  // Filter notes by projectId if provided
  const notes = projectId
    ? allNotes.filter((note) => note.projectId === projectId)
    : allNotes;

  const pinned = projectId
    ? allPinned.filter((note) => note.projectId === projectId)
    : allPinned;

  const createNote = useCallback(
    async (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
      const now = formatDateForNote(new Date());
      return notesCollection.insert({
        ...note,
        id: v7(),
        createdAt: now,
        updatedAt: now,
      });
    },
    []
  );

  const updateNote = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Note, "id" | "createdAt" | "updatedAt">>
    ) => {
      await notesCollection.update(id, (draft) => {
        Object.assign(draft, {
          ...updates,
          updatedAt: formatDateForNote(new Date()),
        });
      });
    },
    []
  );

  const togglePin = useCallback(async (id: string) => {
    await notesCollection.update(id, (draft) => {
      draft.isPinned = !draft.isPinned;
      draft.updatedAt = formatDateForNote(new Date());
    });
  }, []);

  const toggleArchive = useCallback(async (id: string) => {
    await notesCollection.update(id, (draft) => {
      draft.isArchived = !draft.isArchived;
      draft.updatedAt = formatDateForNote(new Date());
    });
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    await notesCollection.delete(id);
  }, []);

  return {
    notes,
    pinned,
    isLoading,
    createNote,
    updateNote,
    togglePin,
    toggleArchive,
    deleteNote,
  };
}
