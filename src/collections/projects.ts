import { z } from "zod";

import { v7 } from "uuid";

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  excerpt: z.string().optional(),
  color: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  categoryIds: z.array(z.string()).optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const getNextProjectId = () => v7();

// Helper function to create a project with proper timestamps
export const createProjectWithTimestamps = (
  input: CreateProjectInput
): Project => {
  const now = new Date().toISOString();
  return {
    id: getNextProjectId(),
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
  categoryIds?: string[];
};
export type UpdateProjectInput = Partial<
  Omit<Project, "id" | "createdAt" | "updatedAt">
>;
