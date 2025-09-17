import type { Note } from "@/collections/notes";
import { baseNotesCollection } from "@/lib/db";
import { filterNotes, type NoteFilter } from "@/lib/filters";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";

export function useNotesByFilter(filter: NoteFilter) {
  const query = useLiveQuery((q) =>
    q
      .from({ note: baseNotesCollection })
      .where(({ note }) => eq(note.isArchived, false))
      .orderBy(({ note }) => note.updatedAt, "desc")
  ) as unknown as { data: Note[]; isLoading: boolean };
  const { data: notes = [], isLoading } = query;

  const filtered = useMemo(() => filterNotes(notes, filter), [notes, filter]);

  return { notes: filtered, isLoading } as const;
}
