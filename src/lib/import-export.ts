import type { Note } from "@/collections/notes";

export const exportNotes = (notes: Note[], filename = "notes-export.json") => {
  const dataStr = JSON.stringify(notes, null, 2);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
    dataStr
  )}`;

  const exportFileDefaultName = filename;
  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
};

export const importNotes = (
  file: File
): Promise<Array<Omit<Note, "id" | "createdAt" | "updatedAt">>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const nameLower = file.name.toLowerCase();
        const isTxt = file.type === "text/plain" || nameLower.endsWith(".txt");

        if (isTxt) {
          // Each non-empty line becomes a note; title derived from content
          const lines = content
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

          const notes = lines.map((line) => {
            const title = line.length > 60 ? `${line.slice(0, 57)}...` : line;
            return {
              title,
              content: line,
              color: undefined,
              categoryId: undefined,
              tagIds: [],
              projectId: undefined,
              projectIds: [],
              categoryIds: [],
              isArchived: false,
              isPinned: false,
            } as Omit<Note, "id" | "createdAt" | "updatedAt">;
          });

          resolve(notes);
          return;
        }

        // JSON fallback
        const raw = JSON.parse(content) as unknown;
        if (!Array.isArray(raw)) {
          throw new Error("Invalid file format: expected an array of notes");
        }

        const normalized = raw.map((noteObj) => {
          const note = noteObj as Partial<Note>;
          const title = (note.title ?? "Untitled Note").toString();
          const contentStr = (note.content ?? "").toString();
          const tagIds = Array.isArray(note.tagIds)
            ? note.tagIds.map((t) => t.toString())
            : [];

          const payload: Omit<Note, "id" | "createdAt" | "updatedAt"> = {
            title,
            content: contentStr,
            color: note.color,
            categoryId: note.categoryId,
            tagIds,
            projectId: note.projectId,
            projectIds: note.projectIds ?? [],
            categoryIds: note.categoryIds ?? [],
            isArchived: Boolean(note.isArchived),
            isPinned: Boolean(note.isPinned),
          };
          return payload;
        });

        resolve(normalized);
      } catch (error) {
        console.error("Error parsing notes:", error);
        reject(
          new Error(
            "Failed to parse notes file. Please ensure it is a valid JSON or TXT file."
          )
        );
      }
    };

    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };

    reader.readAsText(file);
  });
};
