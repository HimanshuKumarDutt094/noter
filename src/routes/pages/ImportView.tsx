import { useNavigate } from "react-router";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { notesCollection } from "@/lib/db";
import { getNextNoteId } from "@/collections/notes";
import { NoteImporter } from "@/components/notes/NoteImporter";
import type { CreateNoteInput } from "@/collections/notes";

export function ImportView() {
  const navigate = useNavigate();

  const handleImport = async (notes: CreateNoteInput[]) => {
    if (notes.length === 0) {
      toast.error("No notes to import");
      return;
    }

    const toastId = toast.loading(`Importing ${notes.length} notes...`);

    try {
      const now = new Date();

      // Process each note with a small delay to avoid UI freeze
      for (const note of notes) {
        await notesCollection.insert({
          ...note,
          id: getNextNoteId(),
          createdAt: String(now),
          updatedAt: String(now),
          isArchived: note.isArchived ?? false,
          isPinned: note.isPinned ?? false,
          tagIds: note.tagIds ?? [],
        });
      }

      toast.success(`Successfully imported ${notes.length} notes!`, {
        id: toastId,
      });
      navigate("/notes");
    } catch (error) {
      console.error("Error importing notes:", error);
      toast.error("Failed to import some notes. Please try again.", {
        id: toastId,
      });
    }
  };

  return (
    <div className="container mx-auto py-4 sm:py-8 px-2 sm:px-4 max-w-6xl">
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl sm:text-2xl font-bold">
            Import Notes
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Import notes from a text file. Each paragraph will be imported as a
            separate note.
          </p>
        </CardHeader>
        <div className="p-4 sm:p-6 pt-0">
          <NoteImporter onImport={handleImport} onCancel={() => navigate(-1)} />
        </div>
      </Card>
    </div>
  );
}
