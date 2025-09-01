import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import type { CreateNoteInput } from "@/collections/notes";

type NoteDraft = Omit<CreateNoteInput, "id" | "createdAt" | "updatedAt"> & {
  id: number;
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

  const processFile = (file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      // Normalize all line endings to \n and split by one or more newlines
      const normalizedContent = content.replace(/\r\n?|\n/g, "\n");
      // Split by one or more newlines to handle both single and double line breaks
      // Also handle cases where there might be extra whitespace
      const noteContents = normalizedContent
        .split(/\n\s*\n+/)
        .map((note) => note.trim())
        .filter((note) => note.length > 0);

      const timestamp = Date.now();
      const newNotes = noteContents
        .map((content) => content.trim())
        .filter((content) => content.length > 0)
        .map((content, index) => {
          const firstLine = content.split("\n")[0];
          return {
            id: -1, // Will be set by the database
            tempId: `import-${timestamp}-${index}`,
            title: firstLine?.slice(0, 50) || "Untitled Note",
            content: content,
            tagIds: ["imported"],
            isArchived: false,
            isPinned: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            projectIds: [],
            categoryIds: [],
          };
        });

      setNotes(newNotes);
    };

    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "text/plain") {
      processFile(file);
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
    onImport(
      notes.map(({ ...note }) => ({
        ...note,
        id: -1, // Will be set by the database
        tagIds: note.tagIds || [],
        isArchived: note.isArchived || false,
        isPinned: note.isPinned || false,
      }))
    );
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
                <input
                  type="text"
                  value={note.title}
                  onChange={(e) =>
                    handleUpdateNote(note.tempId, { title: e.target.value })
                  }
                  className="w-full bg-transparent border-b border-transparent focus:border-foreground outline-none"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={note.content}
                onChange={(e) =>
                  handleUpdateNote(note.tempId, { content: e.target.value })
                }
                className="w-full h-32 p-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="mt-2 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
                <div className="w-full sm:flex-1">
                  <input
                    type="text"
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
                    className="text-sm w-full bg-transparent border-b border-transparent focus:border-foreground outline-none"
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
