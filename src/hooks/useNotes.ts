import { useCallback } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { notesCollection, pinnedNotes, baseNotesCollection } from "@/lib/db";
import type { Note } from "@/lib/db";
import { newId } from "@/lib/id";
import { nowIso } from "@/lib/time";

export function useNotes(projectId?: string) {
  const notesQuery = useLiveQuery(notesCollection);
  const pinnedQuery = useLiveQuery(pinnedNotes);

  const { data: allNotes = [], isLoading } = notesQuery;
  const { data: allPinned = [] } = pinnedQuery;

  // Filter notes by projectId if provided (arrays-only post-migration)
  const notes = projectId
    ? allNotes.filter((note) => Array.isArray(note.projectIds) && note.projectIds.includes(projectId))
    : allNotes;

  const pinned = projectId
    ? allPinned.filter((note) => Array.isArray(note.projectIds) && note.projectIds.includes(projectId))
    : allPinned;

  const createNote = useCallback(
    async (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
      const now = nowIso();
      return baseNotesCollection.insert({
        ...note,
        id: newId(),
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
      await baseNotesCollection.update(id, (draft) => {
        Object.assign(draft, {
          ...updates,
          updatedAt: nowIso(),
        });
      });
    },
    []
  );

  const togglePin = useCallback(async (id: string) => {
    await baseNotesCollection.update(id, (draft) => {
      draft.isPinned = !draft.isPinned;
      draft.updatedAt = nowIso();
    });
  }, []);

  const toggleArchive = useCallback(async (id: string) => {
    await baseNotesCollection.update(id, (draft) => {
      draft.isArchived = !draft.isArchived;
      draft.updatedAt = nowIso();
    });
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    await baseNotesCollection.delete(id);
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
