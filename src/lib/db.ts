import {
  CategorySchema,
  TagSchema,
  type Category,
  type Tag,
} from "@/collections/categories";
import { dexieCollectionOptions } from "tanstack-dexie-db-collection";
import { NoteSchema } from "@/collections/notes";
import { PreferencesSchema } from "@/collections/preferences";
import { ProjectSchema } from "@/collections/projects";
import {
  and,
  createCollection,
  eq,
  inArray,
  liveQueryCollectionOptions,
  or,
} from "@tanstack/react-db";

// Base collection for notes with Dexie sync
const baseNotesCollection = createCollection(
  dexieCollectionOptions({
    id: "notes",
    schema: NoteSchema,
    tableName: "notes",
    dbName: "noter",
    getKey: (item) => item.id,
  })
);

// Base collection for user preferences (single-row for now)
const basePreferencesCollection = createCollection(
  dexieCollectionOptions({
    id: "preferences",
    schema: PreferencesSchema,
    tableName: "preferences",
    dbName: "noter",
    getKey: (item) => item.id,
  })
);

// Live collection for preferences (may contain one row)
export const preferencesCollection = createCollection(
  liveQueryCollectionOptions({
    id: "preferences-live",
    query: (q) => q.from({ pref: basePreferencesCollection }),
  })
);

// Base collection for projects with Dexie
const baseProjectsCollection = createCollection(
  dexieCollectionOptions({
    id: "projects",
    schema: ProjectSchema,
    tableName: "projects",
    dbName: "noter",
    getKey: (item) => item.id,
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
    startSync: true,
    query: (q) =>
      q
        .from({ note: baseNotesCollection })
        .where(({ note }) => eq(note.isArchived, false))
        .orderBy(({ note }) => note.updatedAt, "desc"),
  })
);

export const unpinnedNotesCollection = createCollection(
  liveQueryCollectionOptions({
    id: "unpinned-notes-live",
    startSync: true,
    query: (q) =>
      q
        .from({ note: baseNotesCollection })
        .where(({ note }) =>
          and(eq(note.isArchived, false), eq(note.isPinned, false))
        )
        .orderBy(({ note }) => note.updatedAt, "desc"),
  })
);

export const archivedNotesCollection = createCollection(
  liveQueryCollectionOptions({
    id: "archived-notes-live",
    startSync: true,
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
    startSync: true,
    query: (q) =>
      q
        .from({ note: baseNotesCollection })
        .where(({ note }) => eq(note.isPinned, true))
        .orderBy(({ note }) => note.updatedAt, "desc"),
  })
);

// Helper function to get notes by project ID
/**
 * @deprecated Use getNotesByProjects([projectId]) instead.
 * Kept for backward compatibility; delegates to the array-based API.
 */
export const getNotesByProject = (projectId: string) => {
  return getNotesByProjects([projectId]);
};

// Multi-project helper (legacy-safe: supports array and single projectId)
export const getNotesByProjects = (projectIds: readonly string[]) => {
  const ids = [...projectIds];
  return createCollection(
    liveQueryCollectionOptions({
      id: `project-notes-many-${ids.sort().join("-")}`,
      query: (q) => {
        let qb = q.from({ note: baseNotesCollection });
        if (ids.length > 0) {
          // Build an expression that matches if any of the provided ids match either projectId or projectIds[]
          qb = qb.where(({ note }) => {
            // Fold: or(or(...), ...)
            const exprs = ids.map((id) =>
              or(eq(note.projectId, id), inArray(id, note.projectIds))
            );
            // Combine all with or()
            let combined = exprs[0]!;
            for (let i = 1; i < exprs.length; i++) {
              combined = or(combined, exprs[i]!);
            }
            return combined;
          });
        }
        return qb.orderBy(({ note }) => note.updatedAt, "desc");
      },
    })
  );
};

// Create base collections for categories and tags
const baseCategoriesCollection = createCollection(
  dexieCollectionOptions({
    id: "categories",
    schema: CategorySchema,
    tableName: "categories",
    dbName: "noter",
    getKey: (item) => item.id,
  })
);

const baseTagsCollection = createCollection(
  dexieCollectionOptions({
    id: "tags",
    schema: TagSchema,
    tableName: "tags",
    dbName: "noter",
    getKey: (item) => item.id,
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

// Page-based pagination helpers using TanStack DB `limit` + `offset`.
// These create pre-configured live query collections for a specific page.
// Usage: const pageQuery = createPagedNotesCollection({ page: 0, limit: 50 });
// Then use `useLiveQuery(() => pageQuery)` in components.
export function createPagedNotesCollection({
  page = 0,
  limit = 50,
  archived,
  pinned,
}: {
  page?: number;
  limit?: number;
  // optional filters: pass `false` to exclude archived/pinned notes
  archived?: boolean | undefined;
  pinned?: boolean | undefined;
}) {
  const id = `notes-page-${limit}-${page}-${String(archived)}-${String(
    pinned
  )}`;

  return createCollection(
    liveQueryCollectionOptions({
      id,
      // Ensure paged collections start the Dexie sync so the reactive layer
      // has data to page through (matches other collections like unpinned)
      startSync: true,
      query: (q) => {
        let qb = q.from({ note: baseNotesCollection });
        // Apply optional filters to match collection semantics like `unpinnedNotesCollection`
        if (archived !== undefined || pinned !== undefined) {
          qb = qb.where(({ note }) => {
            const exprs = [];
            if (archived !== undefined)
              exprs.push(eq(note.isArchived, archived));
            if (pinned !== undefined) exprs.push(eq(note.isPinned, pinned));
            if (exprs.length === 0) return exprs[0];
            // Combine expressions with `and`
            let combined = exprs[0];
            for (let i = 1; i < exprs.length; i++)
              combined = and(combined, exprs[i]);
            return combined;
          });
        }

        return qb
          .orderBy(({ note }) => note.updatedAt, "desc")
          .limit(limit)
          .offset(page * limit);
      },
    })
  );
}

export function createPagedProjectsCollection({
  page = 0,
  limit = 50,
}: {
  page?: number;
  limit?: number;
}) {
  const id = `projects-page-${limit}-${page}`;

  return createCollection(
    liveQueryCollectionOptions({
      id,
      query: (q) =>
        q
          .from({ project: baseProjectsCollection })
          .orderBy(({ project }) => project.name, "asc")
          .limit(limit)
          .offset(page * limit),
    })
  );
}

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
export const unpinnedNotes = unpinnedNotesCollection;
export const activeProjects = projectsCollection;
export const db = {
  notes: baseNotesCollection,
  projects: baseProjectsCollection,
  categories: baseCategoriesCollection,
  tags: baseTagsCollection,
  preferences: basePreferencesCollection,
};

// Export base collections for direct access if needed
export {
  baseCategoriesCollection,
  baseNotesCollection,
  basePreferencesCollection,
  baseProjectsCollection,
  baseTagsCollection,
};

// Re-export types for convenience
export type { Category, Tag } from "@/collections/categories";
export type { Note } from "@/collections/notes";
export type { Project } from "@/collections/projects";
