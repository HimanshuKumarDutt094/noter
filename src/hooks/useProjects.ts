import { useCallback } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import {
  projectsCollection,
  baseProjectsCollection,
  type Project,
} from "@/lib/db";
import type { CreateProjectInput } from "@/collections/projects";
import { newId } from "@/lib/id";
import { nowIso } from "@/lib/time";

export function useProjects() {
  const { data: projects = [], isLoading } = useLiveQuery(projectsCollection);

  const createProject = useCallback(
    async (project: CreateProjectInput) => {
      const now = nowIso();
      return baseProjectsCollection.insert({
        ...project,
        // ensure mutable array type for TS compatibility
        categoryIds: project.categoryIds ? [...project.categoryIds] : [],
        id: newId(),
        createdAt: now,
        updatedAt: now,
      });
    },
    []
  );

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
