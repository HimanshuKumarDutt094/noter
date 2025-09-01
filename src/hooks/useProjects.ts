import { useCallback } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import {
  projectsCollection,
  baseProjectsCollection,
  type Project,
} from "@/lib/db";
import { v7 } from "uuid";

export function useProjects() {
  const { data: projects = [], isLoading } = useLiveQuery(projectsCollection);

  const createProject = useCallback(
    async (project: Omit<Project, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      return baseProjectsCollection.insert({
        ...project,
        id: v7(),
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
          updatedAt: new Date().toISOString(),
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
