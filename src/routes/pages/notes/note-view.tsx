import type { Note } from "@/collections/notes";
import { Button } from "@/components/ui/button";
import { baseNotesCollection } from "@/lib/db";
import { routes } from "@/routes/route-paths";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useRef } from "react";
import { useNavigate, useParams } from "react-router";

export function NoteView() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();

  const { data: [note] = [], isLoading } = useLiveQuery((q) =>
    q
      .from({ note: baseNotesCollection })
      .where(({ note }) => eq(note.id, noteId))
      .select(({ note }) => note)
  ) as unknown as { data: Note[]; isLoading: boolean };

  // Keep previous data to avoid UI flicker on background refetches
  const prevNoteRef = useRef(note ?? null);
  if (note) prevNoteRef.current = note;
  const displayNote = note ?? prevNoteRef.current;

  if (!noteId) {
    return (
      <div className="p-6 flex flex-col items-center gap-4">
        <h2 className="text-xl font-semibold">Invalid note</h2>
        <p className="text-sm text-muted-foreground">
          No note id was provided.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button onClick={() => navigate(routes.home())}>All Notes</Button>
        </div>
      </div>
    );
  }

  // Only show loading on first mount if there is no cached data
  if (isLoading && !displayNote) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading note…</p>
      </div>
    );
  }

  if (!displayNote) {
    return (
      <div className="p-6 flex flex-col items-center gap-4">
        <h2 className="text-xl font-semibold">Note not found</h2>
        <p className="text-sm text-muted-foreground">
          The note you’re looking for might have been deleted or moved.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button onClick={() => navigate(routes.home())}>All Notes</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{displayNote.title}</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate(routes.home())}>
            Back to Notes
          </Button>
          <Button onClick={() => navigate(routes.notes.editQuery(noteId))}>
            Edit
          </Button>
        </div>
      </div>
      <div className="prose dark:prose-invert max-w-none">
        {displayNote.content}
      </div>
    </div>
  );
}
