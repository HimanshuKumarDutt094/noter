import type { Note } from "@/collections/notes";
import { filterNotes, type NoteFilter } from "@/lib/filters";
import { NoteList } from "@/components/notes/NoteList";

export type ProjectNotesPanelProps = {
  allNotes: readonly Note[];
  filter: NoteFilter;
  onAddNote: () => void;
  onEditNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onArchiveNote: (id: string) => void;
  onImportNotes: (notes: Array<Omit<Note, "id" | "createdAt" | "updatedAt">>) => void;
};

export function ProjectNotesPanel({
  allNotes,
  filter,
  onAddNote,
  onEditNote,
  onDeleteNote,
  onTogglePin,
  onArchiveNote,
  onImportNotes,
}: ProjectNotesPanelProps) {
  const notes = filterNotes(allNotes, filter);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Notes</h2>
      <NoteList
        notes={notes}
        onAddNote={onAddNote}
        onEditNote={onEditNote}
        onDeleteNote={onDeleteNote}
        onTogglePin={onTogglePin}
        onArchiveNote={onArchiveNote}
        onImportNotes={onImportNotes}
      />
    </div>
  );
}
