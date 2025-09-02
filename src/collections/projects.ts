import { z } from "zod";
import { newId } from "../lib/id";
import { nowIso } from "../lib/time";
import type { ColorValue } from "../lib/colors";
import { HexColorSchema } from "../lib/colors";

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  excerpt: z.string().optional(),
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
