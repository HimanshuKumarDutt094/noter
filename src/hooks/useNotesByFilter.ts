import { useMemo } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { activeNotesCollection } from "@/lib/db";
import type { Note } from "@/collections/notes";
import { filterNotes, type NoteFilter } from "@/lib/filters";

export function useNotesByFilter(filter: NoteFilter) {
  const { data: notes = [], isLoading, error } = useLiveQuery(activeNotesCollection) as {
    data: Note[];
    isLoading: boolean;
    error?: unknown;
  };

  const filtered = useMemo(() => filterNotes(notes, filter), [notes, filter]);

  return { notes: filtered, isLoading, error } as const;
}
