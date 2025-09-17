import { z } from "zod";
import type { ColorValue } from "../lib/colors";
import { HexColorSchema } from "../lib/colors";
import { newId } from "../lib/id";
import { nowIso } from "../lib/time";

export const ProjectSchema = z.object({
  id: z.string(),
  // Limit name length to avoid extremely long titles in UI
  name: z.string().min(1).max(120),
  // Description can remain free-form
  description: z.string().optional(),
  // Excerpt (short summary) should be limited so cards remain tidy
  excerpt: z.string().max(240).optional(),
  color: HexColorSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  categoryIds: z.array(z.string()).optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

// Helper function to create a project with proper timestamps
export const createProjectWithTimestamps = (
  input: CreateProjectInput
): Project => {
  const now = nowIso();
  return {
    id: newId(),
    ...input,
    categoryIds: input.categoryIds ?? [],
    createdAt: now,
    updatedAt: now,
  };
};

export type CreateProjectInput = Omit<
  Project,
  "id" | "createdAt" | "updatedAt"
> & {
  categoryIds?: readonly string[];
  color?: ColorValue;
};
export type UpdateProjectInput = Partial<
  Omit<Project, "id" | "createdAt" | "updatedAt">
>;
