import { createCollection } from "@tanstack/react-db";
import { liveQueryCollectionOptions, eq } from "@tanstack/react-db";
import { NoteSchema, type Note } from "@/collections/notes";
import { ProjectSchema, type Project } from "@/collections/projects";
import { CategorySchema, type Category } from "@/collections/categories";
import { TagSchema, type Tag } from "@/collections/categories";
import { indexdbCollectionOptions } from "@/db/indexdbCollectionOptions";
import { noteMatchesAnyProject } from "@/lib/filters";

// Database collections using IndexDB

// Base collection for notes with Electric SQL sync
const baseNotesCollection = createCollection(
  indexdbCollectionOptions({
    id: "notes",
    schema: NoteSchema,
    tableName: "notes",
    dbName: "todoist",

    getKey: (item: Note) => item.id,
  })
);

// Base collection for projects with IndexDB
const baseProjectsCollection = createCollection(
  indexdbCollectionOptions({
    id: "projects",
    schema: ProjectSchema,
    tableName: "projects",
    dbName: "todoist",
    getKey: (item: Project) => item.id,
  })
);

// Create live query collections for all data access
export const notesCollection = createCollection(
  liveQueryCollectionOptions({
    id: "all-notes-live",
    query: (q) =>
      q
        .from({ note: baseNotesCollection })
        .orderBy(({ note }) => note.updatedAt, "desc"),
  })
);

export const projectsCollection = createCollection(
  liveQueryCollectionOptions({
    id: "all-projects-live",
    query: (q) =>
      q
        .from({ project: baseProjectsCollection })
        .orderBy(({ project }) => project.name, "asc"),
  })
);

export const activeNotesCollection = createCollection(
  liveQueryCollectionOptions({
    id: "active-notes-live",
    query: (q) =>
      q
        .from({ note: baseNotesCollection })
        .where(({ note }) => eq(note.isArchived, false))
        .orderBy(({ note }) => note.updatedAt, "desc"),
  })
);

export const archivedNotesCollection = createCollection(
  liveQueryCollectionOptions({
    id: "archived-notes-live",
    query: (q) =>
      q
        .from({ note: baseNotesCollection })
        .where(({ note }) => eq(note.isArchived, true))
        .orderBy(({ note }) => note.updatedAt, "desc"),
  })
);

export const pinnedNotesCollection = createCollection(
  liveQueryCollectionOptions({
    id: "pinned-notes-live",
    query: (q) =>
      q
        .from({ note: baseNotesCollection })
        .where(({ note }) => eq(note.isPinned, true))
        .orderBy(({ note }) => note.updatedAt, "desc"),
  })
);

// Helper function to get notes by project ID
export const getNotesByProject = (projectId: string) => {
  return createCollection(
    liveQueryCollectionOptions({
      id: `project-notes-${projectId}`,
      query: (q) =>
        q
          .from({ note: baseNotesCollection })
          .where(({ note }) =>
            eq(note.projectId as unknown as string, projectId)
          )
          .orderBy(({ note }) => note.updatedAt, "desc"),
    })
  );
};

// Multi-project helper (legacy-safe: supports array and single projectId)
export const getNotesByProjects = (projectIds: readonly string[]) => {
  const ids = [...projectIds];
  return createCollection(
    liveQueryCollectionOptions({
      id: `project-notes-many-${ids.sort().join("-")}`,
      query: (q) =>
        q
          .from({ note: baseNotesCollection })
          .where(({ note }) => (ids.length === 0 ? true : noteMatchesAnyProject(note as unknown as Note, ids)))
          .orderBy(({ note }) => note.updatedAt, "desc"),
    })
  );
};

// Create base collections for categories and tags
const baseCategoriesCollection = createCollection(
  indexdbCollectionOptions({
    id: "categories",
    schema: CategorySchema,
    tableName: "categories",
    dbName: "todoist",
    getKey: (item: Category) => item.id,
  })
);

const baseTagsCollection = createCollection(
  indexdbCollectionOptions({
    id: "tags",
    schema: TagSchema,
    tableName: "tags",
    dbName: "todoist",
    getKey: (item: Tag) => item.id,
  })
);

// Create live query collections for all data access
export const categoriesCollection = createCollection(
  liveQueryCollectionOptions({
    id: "all-categories-live",
    query: (q) =>
      q
        .from({ category: baseCategoriesCollection })
        .orderBy(({ category }) => category.name, "asc"),
  })
);

export const tagsCollection = createCollection(
  liveQueryCollectionOptions({
    id: "all-tags-live",
    query: (q) =>
      q.from({ tag: baseTagsCollection }).orderBy(({ tag }) => tag.name, "asc"),
  })
);

// Helper functions
export async function getCategoryById(
  id: string
): Promise<Category | undefined> {
  return await baseCategoriesCollection.get(id);
}

export async function getTagById(id: string): Promise<Tag | undefined> {
  return await baseTagsCollection.get(id);
}

// Export additional collections and utilities
export const pinnedNotes = pinnedNotesCollection;
export const activeProjects = projectsCollection;
export const db = {
  notes: baseNotesCollection,
  projects: baseProjectsCollection,
  categories: baseCategoriesCollection,
  tags: baseTagsCollection,
};

// Export base collections for direct access if needed
export { baseNotesCollection, baseProjectsCollection, baseCategoriesCollection, baseTagsCollection };

// Re-export types for convenience
export type { Note } from "@/collections/notes";
export type { Project } from "@/collections/projects";
export type { Category, Tag } from "@/collections/categories";
