import type { Note } from '@/lib/db';
import { NoteComponent } from './Note';

type NoteListProps = {
  notes: Note[];
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
  emptyMessage?: string;
};

export function NoteList({
  notes,
  onUpdate,
  onDelete,
  onTogglePin,
  onToggleArchive,
  emptyMessage = 'No notes found',
}: NoteListProps) {
  if (notes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {notes.map((note) => (
        <div key={note.id} className="h-full">
          <NoteComponent
            note={note}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onTogglePin={onTogglePin}
            onToggleArchive={onToggleArchive}
          />
        </div>
      ))}
    </div>
  );
}
