import { z } from "zod";
import { newId } from "../lib/id";
import { nowIso } from "../lib/time";
import type { ColorValue } from "../lib/colors";
import { HexColorSchema } from "../lib/colors";

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Category name is required"),
  color: HexColorSchema,
  projectId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Category = z.infer<typeof CategorySchema>;

export const TagSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Tag name is required"),
  color: HexColorSchema,
  projectId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Tag = z.infer<typeof TagSchema>;

export const createCategory = (
  name: string,
  color: ColorValue = "#808080",
  projectId?: string
): Omit<Category, "id" | "createdAt" | "updatedAt"> => ({
  name,
  color,
  ...(projectId ? { projectId } : {}),
});

// Helper function to create a category with proper timestamps
export const createCategoryWithTimestamps = (
  input: Omit<Category, "id" | "createdAt" | "updatedAt">
): Category => {
  const now = nowIso();
  return {
    id: newId(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
};

export const createTag = (
  name: string,
  color: ColorValue = "#808080",
  projectId?: string
): Omit<Tag, "id" | "createdAt" | "updatedAt"> => ({
  name,
  color,
  ...(projectId ? { projectId } : {}),
});

// Helper function to create a tag with proper timestamps
export const createTagWithTimestamps = (
  input: Omit<Tag, "id" | "createdAt" | "updatedAt">
): Tag => {
  const now = nowIso();
  return {
    id: newId(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
};

// ID helpers centralized via newId(); no per-entity helpers needed
