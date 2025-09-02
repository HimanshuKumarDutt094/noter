import { useMemo } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { activeNotesCollection } from "@/lib/db";
import { filterNotes, type NoteFilter } from "@/lib/filters";

export function useNotesByFilter(filter: NoteFilter) {
  const query = useLiveQuery(activeNotesCollection);
  const { data: notes = [], isLoading } = query;

  const filtered = useMemo(() => filterNotes(notes, filter), [notes, filter]);

  return { notes: filtered, isLoading } as const;
}
