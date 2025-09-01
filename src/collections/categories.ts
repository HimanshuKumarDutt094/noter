import { z } from "zod";
import { v7 } from "uuid";

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Category name is required"),
  color: z.string(),
  projectId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Category = z.infer<typeof CategorySchema>;

export const TagSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Tag name is required"),
  color: z.string(),
  projectId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Tag = z.infer<typeof TagSchema>;

export const createCategory = (
  name: string,
  color: string = "#808080"
): Omit<Category, "id" | "createdAt" | "updatedAt"> => ({
  name,
  color,
});

// Helper function to create a category with proper timestamps
export const createCategoryWithTimestamps = (input: Omit<Category, "id" | "createdAt" | "updatedAt">): Category => {
  const now = new Date().toISOString();
  return {
    id: v7(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
};

export const createTag = (
  name: string,
  color: string = "#808080"
): Omit<Tag, "id" | "createdAt" | "updatedAt"> => ({
  name,
  color,
});

// Helper function to create a tag with proper timestamps
export const createTagWithTimestamps = (input: Omit<Tag, "id" | "createdAt" | "updatedAt">): Tag => {
  const now = new Date().toISOString();
  return {
    id: v7(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
};

// Expose ID helpers for consistency
export const getNextCategoryId = () => v7();
export const getNextTagId = () => v7();
