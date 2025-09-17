import type { Note } from "@/lib/db";
import { baseNotesCollection } from "@/lib/db";
import { newId } from "@/lib/id";
import { nowIso } from "@/lib/time";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useCallback } from "react";

export function useNotes(projectId?: string) {
  const notesQuery = useLiveQuery((q) =>
    q
      .from({ note: baseNotesCollection })
      .orderBy(({ note }) => note.updatedAt, "desc")
  ) as unknown as { data: Note[]; isLoading: boolean };

  const pinnedQuery = useLiveQuery((q) =>
    q
      .from({ note: baseNotesCollection })
      .where(({ note }) => eq(note.isPinned, true))
      .orderBy(({ note }) => note.updatedAt, "desc")
  ) as unknown as { data: Note[] };

  const { data: allNotes = [], isLoading } = notesQuery;
  const { data: allPinned = [] } = pinnedQuery;

  // Filter notes by projectId if provided (arrays-only post-migration)
  const notes = projectId
    ? allNotes.filter(
        (note) =>
          Array.isArray(note.projectIds) && note.projectIds.includes(projectId)
      )
    : allNotes;

  const pinned = projectId
    ? allPinned.filter(
        (note) =>
          Array.isArray(note.projectIds) && note.projectIds.includes(projectId)
      )
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
