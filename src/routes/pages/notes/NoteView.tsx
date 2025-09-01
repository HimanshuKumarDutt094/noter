import { useParams, useNavigate } from "react-router";
import { useLiveQuery, eq } from "@tanstack/react-db";
import { notesCollection } from "@/lib/db";
import { Button } from "@/components/ui/button";

export function NoteView() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();

  const { data: [note] = [] } = useLiveQuery((q) =>
    q
      .from({ note: notesCollection })
      .where(({ note }) => eq(note.id, noteId))
      .select(({ note }) => note)
  );

  if (!note) {
    return (
      <div className="p-4">
        <p>Loading note...</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{note.title}</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate(`/notes`)}>
            Back to Notes
          </Button>
          <Button onClick={() => navigate(`/notes/${noteId}/edit`)}>
            Edit
          </Button>
        </div>
      </div>
      <div className="prose dark:prose-invert max-w-none">{note.content}</div>
    </div>
  );
}
