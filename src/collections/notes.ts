import { z } from "zod";

import { v7 } from "uuid";
export const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  color: z.string().optional(),
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

export const getNextNoteId = () => v7();

// Helper function to convert Date to ISO string
export const formatDateForNote = (date: Date | string): string => {
  if (date instanceof Date) {
    return date.toISOString();
  }
  return new Date(date).toISOString();
};

// Helper function to create a note with proper timestamps
export const createNoteWithTimestamps = (input: CreateNoteInput): Note => {
  const now = new Date().toISOString();
  return {
    id: getNextNoteId(),
    ...input,
    // Ensure arrays are present
    projectIds: input.projectIds ?? [],
    categoryIds: input.categoryIds ?? [],
    createdAt: now,
    updatedAt: now,
  };
};

// Allow callers to omit new arrays to stay backward compatible
export type CreateNoteInput = Omit<Note, "id" | "createdAt" | "updatedAt"> & {
  projectIds?: string[];
  categoryIds?: string[];
};
export type UpdateNoteInput = Partial<
  Omit<Note, "id" | "createdAt" | "updatedAt">
>;
