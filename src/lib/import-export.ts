import type { Note } from "@/collections/notes";
import { z } from "zod";

// SSR-safe export: no-op with warning when document is unavailable
export const exportNotes = (notes: Note[], filename = "notes-export.json") => {
  const dataStr = JSON.stringify(notes, null, 2);
  // Guard for SSR/test environments
  if (typeof document === "undefined") {
    console.warn(
      "exportNotes skipped: document is not available in this environment"
    );
    return;
  }

  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
    dataStr
  )}`;
  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", filename);
  linkElement.click();
};

// Zod schema for import validation (legacy-safe)
const ImportNoteSchema = z
  .object({
    title: z.string().min(1).catch("Untitled Note"),
    content: z.string().catch(""),
    color: z.string().optional().nullable(),
    // Legacy single-field relations
    projectId: z.string().optional().nullable(),
    categoryId: z.string().optional().nullable(),
    // Normalized arrays
    projectIds: z.array(z.string()).optional(),
    categoryIds: z.array(z.string()).optional(),
    tagIds: z.array(z.string()).optional(),
    isArchived: z.boolean().optional(),
    isPinned: z.boolean().optional(),
  })
  .passthrough();

type ImportPayload = Omit<Note, "id" | "createdAt" | "updatedAt">;

export const importNotes = (file: File): Promise<Array<ImportPayload>> => {
  return new Promise((resolve, reject) => {
    // Guard for non-browser environments
    if (typeof FileReader === "undefined") {
      reject(new Error("FileReader is not available in this environment"));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        console.debug("[import-export] reader.onload: content length", {
          length: content?.length ?? 0,
          fileName: file.name,
          fileType: file.type,
        });
        const nameLower = file.name.toLowerCase();
        const isTxt = file.type === "text/plain" || nameLower.endsWith(".txt");

        if (isTxt) {
          console.debug("[import-export] detected TXT file, parsing lines");
          // Each non-empty line becomes a note; title derived from content
          const lines = content
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

          console.debug("[import-export] txt parse result", {
            lines: lines.length,
          });
          const notes = lines.map((line) => {
            const title = line.length > 60 ? `${line.slice(0, 57)}...` : line;
            const payload: ImportPayload = {
              title,
              content: line,
              color: undefined,
              tagIds: [],
              projectIds: [],
              categoryIds: [],
              isArchived: false,
              isPinned: false,
            };
            return payload;
          });

          resolve(notes);
          return;
        }

        // JSON fallback
        console.debug("[import-export] attempting JSON parse");
        const raw = JSON.parse(content) as unknown;
        if (!Array.isArray(raw)) {
          throw new Error("Invalid file format: expected an array of notes");
        }

        const errors: Array<{ index: number; message: string }> = [];
        const normalized: ImportPayload[] = [];

        raw.forEach((item, idx) => {
          const parsed = ImportNoteSchema.safeParse(item);
          if (!parsed.success) {
            errors.push({ index: idx, message: parsed.error.message });
            return;
          }
          const n = parsed.data;
          const projectIds = Array.isArray(n.projectIds)
            ? n.projectIds
            : n.projectId
            ? [n.projectId]
            : [];
          const categoryIds = Array.isArray(n.categoryIds)
            ? n.categoryIds
            : n.categoryId
            ? [n.categoryId]
            : [];
          const tagIds = Array.isArray(n.tagIds) ? n.tagIds : [];

          const payload: ImportPayload = {
            title: n.title,
            content: n.content,
            color: n.color ?? undefined,
            // Keep legacy single fields for compatibility if present
            projectId: n.projectId ?? projectIds[0] ?? undefined,
            categoryId: n.categoryId ?? categoryIds[0] ?? undefined,
            // Normalized arrays
            projectIds,
            categoryIds,
            tagIds,
            isArchived: Boolean(n.isArchived),
            isPinned: Boolean(n.isPinned),
          };
          normalized.push(payload);
        });

        if (errors.length > 0) {
          console.warn("[import-export] some items failed validation", {
            errors,
          });
          const msg =
            `Failed to parse ${errors.length} items: ` +
            errors.map((e) => `#${e.index}: ${e.message}`).join("; ");
          throw new Error(msg);
        }

        console.debug("[import-export] json parse normalized items", {
          count: normalized.length,
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
