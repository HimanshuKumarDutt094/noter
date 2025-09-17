import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import type { CreateNoteInput } from "@/collections/notes";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { importNotes } from "@/lib/import-export";

type NoteDraft = Omit<CreateNoteInput, "id"> & {
  tempId: string; // Temporary ID for React keys
};

type NoteImporterProps = {
  onImport: (notes: CreateNoteInput[]) => void;
  onCancel: () => void;
};

export function NoteImporter({ onImport, onCancel }: NoteImporterProps) {
  const [notes, setNotes] = useState<NoteDraft[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    try {
      const parsed = await importNotes(file);
      const ts = Date.now();
      const drafts: NoteDraft[] = parsed.map((p, idx) => ({
        tempId: `import-${ts}-${idx}`,
        title: p.title,
        content: p.content,
        color: p.color,
        categoryId: p.categoryId,
        projectId: p.projectId,
        tagIds: p.tagIds ?? [],
        projectIds: p.projectIds ?? [],
        categoryIds: p.categoryIds ?? [],
        isArchived: p.isArchived ?? false,
        isPinned: p.isPinned ?? false,
      }));
      setNotes(drafts);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUpdateNote = (
    tempId: string,
    updates: Partial<Omit<NoteDraft, "id" | "tempId">>
  ) => {
    setNotes(
      notes.map((note) =>
        note.tempId === tempId ? { ...note, ...updates } : note
      )
    );
  };

  const handleImport = () => {
    const payloads: CreateNoteInput[] = notes.map((n) => ({
      title: n.title,
      content: n.content,
      color: n.color,
      categoryId: n.categoryId,
      projectId: n.projectId,
      tagIds: n.tagIds ?? [],
      projectIds: n.projectIds ?? [],
      categoryIds: n.categoryIds ?? [],
      isArchived: n.isArchived ?? false,
      isPinned: n.isPinned ?? false,
    }));
    onImport(payloads);
  };

  if (notes.length === 0) {
    return (
      <div className="space-y-4 p-4 max-w-4xl mx-auto">
        <Card
          className={`border-2 border-dashed min-h-[200px] flex flex-col items-center justify-center ${
            isDragging
              ? "border-primary bg-accent/20"
              : "border-muted-foreground/25"
          } transition-colors hover:border-primary/50`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".txt,text/plain"
            className="hidden"
          />
          <div className="text-center p-4 sm:p-8 w-full">
            <Upload className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium mb-1">
              Drag and drop your text file here
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
              Supports .txt files with notes separated by blank lines
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 w-full">
        {notes.map((note) => (
          <Card key={note.tempId} className="relative group">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                <Input
                  value={note.title}
                  onChange={(e) =>
                    handleUpdateNote(note.tempId, { title: e.target.value })
                  }
                  className="w-full bg-transparent border-0 shadow-none focus-visible:ring-0"
                  placeholder="Title"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={note.content}
                onChange={(e) =>
                  handleUpdateNote(note.tempId, { content: e.target.value })
                }
                className="w-full"
                placeholder="Content"
              />
              <div className="mt-2 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
                <div className="w-full sm:flex-1">
                  <Input
                    value={note.tagIds?.join(", ") || ""}
                    onChange={(e) =>
                      handleUpdateNote(note.tempId, {
                        tagIds: e.target.value
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Add tags (comma separated)"
                    className="text-sm w-full bg-transparent border-0 shadow-none focus-visible:ring-0"
                  />
                </div>
                <div className="w-full sm:w-auto flex flex-col items-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select File
                  </Button>
                  <p className="text-xs text-muted-foreground text-right">
                    Each paragraph will become a separate note
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleImport} disabled={notes.length === 0}>
          Import {notes.length} note{notes.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );
}
