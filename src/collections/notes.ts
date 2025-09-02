import { z } from "zod";
import { newId } from "../lib/id";
import { nowIso } from "../lib/time";
import { HexColorSchema } from "../lib/colors";

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  color: HexColorSchema.optional(),
  // Legacy single links (kept for migration/back-compat)
  categoryId: z.string().optional(),
  projectId: z.string().optional(),
  // New multi links (optional with defaults to not break call sites)
  projectIds: z.array(z.string()),
  categoryIds: z.array(z.string()),
  tagIds: z.array(z.string()),
  isArchived: z.boolean(),
  isPinned: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Note = z.infer<typeof NoteSchema>;

// id/time utils are centralized in lib

// Helper function to create a note with proper timestamps
export const createNoteWithTimestamps = (input: CreateNoteInput): Note => {
  const now = nowIso();
  return {
    id: newId(),
    ...input,
    // Ensure arrays are present
    projectIds: input.projectIds ?? [],
    categoryIds: input.categoryIds ?? [],
    tagIds: input.tagIds ?? [],
    createdAt: now,
    updatedAt: now,
  };
};

// Allow callers to omit new arrays to stay backward compatible
export type CreateNoteInput = Omit<Note, "id" | "createdAt" | "updatedAt"> & {
  projectIds?: string[];
  categoryIds?: string[];
  tagIds?: string[];
};
export type UpdateNoteInput = Partial<
  Omit<Note, "id" | "createdAt" | "updatedAt">
>;
