import type { CreateProjectInput } from "@/collections/projects";
import { baseProjectsCollection, type Project } from "@/lib/db";
import { newId } from "@/lib/id";
import { nowIso } from "@/lib/time";
import { useLiveQuery } from "@tanstack/react-db";
import { useCallback } from "react";

export function useProjects() {
  const { data: projects = [], isLoading } = useLiveQuery((q) =>
    q
      .from({ project: baseProjectsCollection })
      .orderBy(({ project }) => project.name, "asc")
  ) as unknown as { data: Project[]; isLoading: boolean };

  const createProject = useCallback(async (project: CreateProjectInput) => {
    const now = nowIso();
    return baseProjectsCollection.insert({
      ...project,
      // ensure mutable array type for TS compatibility
      categoryIds: project.categoryIds ? [...project.categoryIds] : [],
      id: newId(),
      createdAt: now,
      updatedAt: now,
    });
  }, []);

  const updateProject = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Project, "id" | "createdAt" | "updatedAt">>
    ) => {
      await baseProjectsCollection.update(id, (draft) => {
        Object.assign(draft, {
          ...updates,
          updatedAt: nowIso(),
        });
      });
    },
    []
  );

  const deleteProject = useCallback(async (id: string) => {
    await baseProjectsCollection.delete(id);
  }, []);

  return {
    projects,
    isLoading,
    createProject,
    updateProject,
    deleteProject,
  };
}
