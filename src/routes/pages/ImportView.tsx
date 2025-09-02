import { useNavigate } from "react-router";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { baseNotesCollection } from "@/lib/db";
import { newId } from "@/lib/id";
import { nowIso } from "@/lib/time";
import { NoteImporter } from "@/components/notes/NoteImporter";
import type { CreateNoteInput } from "@/collections/notes";
import { routes } from "@/routes/routePaths";

export function ImportView() {
  const navigate = useNavigate();

  const handleImport = async (notes: CreateNoteInput[]) => {
    if (notes.length === 0) {
      toast.error("No notes to import");
      return;
    }

    const toastId = toast.loading(`Importing ${notes.length} notes...`);

    try {
      const now = nowIso();

      // Process each note with a small delay to avoid UI freeze
      for (const note of notes) {
        await baseNotesCollection.insert({
          ...note,
          id: newId(),
          createdAt: now,
          updatedAt: now,
          isArchived: note.isArchived ?? false,
          isPinned: note.isPinned ?? false,
          tagIds: note.tagIds ?? [],
        });
      }

      toast.success(`Successfully imported ${notes.length} notes!`, {
        id: toastId,
      });
      navigate(routes.notes.index());
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
