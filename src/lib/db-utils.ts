import { newId } from "@/lib/id";
import { nowIso } from "@/lib/time";
import {
  notesCollection,
  projectsCollection,
  activeNotesCollection,
  archivedNotesCollection,
  pinnedNotesCollection,
  baseNotesCollection,
  baseProjectsCollection,
} from "./db";
import type {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
} from "@/collections/notes";
import {
  type Project,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "@/collections/projects";

type CollectionResult<T> = {
  data?: T;
  error?: Error;
  status: "success" | "error";
};

// Note operations
export const noteService = {
  // Create a new note with optimistic updates
  async create(input: CreateNoteInput): Promise<CollectionResult<Note>> {
    try {
      const now = nowIso();
      const newNote: Note = {
        ...input,
        id: newId(),
        // Ensure required arrays exist; backfill legacy single fields
        tagIds: Array.isArray(input.tagIds) ? input.tagIds : [],
        projectIds: Array.isArray((input as Partial<Note>).projectIds)
          ? ((input as Partial<Note>).projectIds as string[])
          : (input as Partial<Note>).projectId
          ? [(input as Partial<Note>).projectId as string]
          : [],
        categoryIds: Array.isArray((input as Partial<Note>).categoryIds)
          ? ((input as Partial<Note>).categoryIds as string[])
          : (input as Partial<Note>).categoryId
          ? [(input as Partial<Note>).categoryId as string]
          : [],
        isArchived: false,
        isPinned: false,
        createdAt: now,
        updatedAt: now,
      };

      await baseNotesCollection.insert(newNote);
      return {
        data: newNote,
        status: "success",
      };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error : new Error("Failed to create note"),
        status: "error",
      };
    }
  },

  // Update a note with optimistic updates
  async update(
    id: string,
    input: UpdateNoteInput
  ): Promise<CollectionResult<Note>> {
    try {
      const current = await baseNotesCollection.get(id);
      if (!current) {
        return {
          error: new Error("Note not found"),
          status: "error",
        };
      }

      const updated: Note = {
        ...current,
        ...input,
        updatedAt: nowIso(),
      };

      await baseNotesCollection.update(id, (draft) => {
        Object.assign(draft, updated);
      });

      return {
        data: updated,
        status: "success",
      };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error : new Error("Failed to update note"),
        status: "error",
      };
    }
  },

  // Delete a note with optimistic updates
  async delete(id: string): Promise<CollectionResult<boolean>> {
    try {
      const exists = await baseNotesCollection.get(id);
      if (!exists) {
        return {
          error: new Error("Note not found"),
          status: "error",
        };
      }

      await baseNotesCollection.delete(id);
      return {
        data: true,
        status: "success",
      };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error : new Error("Failed to delete note"),
        status: "error",
      };
    }
  },

  // Get single note by ID
  async getById(id: string): Promise<CollectionResult<Note>> {
    try {
      const note = await baseNotesCollection.get(id);
      if (!note) {
        return {
          error: new Error("Note not found"),
          status: "error",
        };
      }
      return {
        data: note,
        status: "success",
      };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error : new Error("Failed to fetch note"),
        status: "error",
      };
    }
  },

  // Get all notes with reactive query
  async getAll(): Promise<CollectionResult<Note[]>> {
    try {
      const result: Note[] = await notesCollection.toArray;
      return {
        data: result,
        status: "success",
      };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error : new Error("Failed to fetch notes"),
        status: "error",
      };
    }
  },

  // Get active notes using the pre-defined collection
  async getActiveNotes(): Promise<CollectionResult<Note[]>> {
    try {
      const result: Note[] = await activeNotesCollection.toArray;
      return {
        data: result,
        status: "success",
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to fetch active notes"),
        status: "error",
      };
    }
  },

  // Get archived notes using the pre-defined collection
  async getArchivedNotes(): Promise<CollectionResult<Note[]>> {
    try {
      const result: Note[] = await archivedNotesCollection.toArray;
      return {
        data: result,
        status: "success",
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to fetch archived notes"),
        status: "error",
      };
    }
  },

  // Get pinned notes using the pre-defined collection
  async getPinnedNotes(): Promise<CollectionResult<Note[]>> {
    try {
      const result: Note[] = await pinnedNotesCollection.toArray;
      return {
        data: result,
        status: "success",
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to fetch pinned notes"),
        status: "error",
      };
    }
  },

  // Get notes by project ID with reactive query
  async getByProject(projectId: string): Promise<CollectionResult<Note[]>> {
    try {
      const allNotes: Note[] = await notesCollection.toArray;
      const filteredNotes = allNotes.filter((note: Note) => {
        // Prefer normalized array-based relation
        if (Array.isArray(note.projectIds)) {
          return note.projectIds.includes(projectId);
        }
        // Legacy fallback
        return (note as Partial<Note>).projectId === projectId;
      });
      return {
        data: filteredNotes,
        status: "success",
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to fetch project notes"),
        status: "error",
      };
    }
  },

  // Search notes by title or content with reactive query
  async search(term: string): Promise<CollectionResult<Note[]>> {
    try {
      const lowerTerm = term.toLowerCase();
      const allNotes: Note[] = await notesCollection.toArray;
      const filteredNotes = allNotes.filter(
        (note: Note) =>
          note.title.toLowerCase().includes(lowerTerm) ||
          note.content.toLowerCase().includes(lowerTerm)
      );
      return {
        data: filteredNotes,
        status: "success",
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error("Search failed"),
        status: "error",
      };
    }
  },

  // Toggle archive status with optimistic updates
  async toggleArchive(id: string): Promise<CollectionResult<Note>> {
    try {
      const result = await this.getById(id);
      if (!result.data) {
        return result; // Will contain the error
      }

      const updatedNote = await this.update(id, {
        isArchived: !result.data.isArchived,
        isPinned: result.data.isArchived ? result.data.isPinned : false, // Unpin when archiving
      });

      return updatedNote;
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to toggle archive status"),
        status: "error",
      };
    }
  },

  // Toggle pin status with optimistic updates
  async togglePin(id: string): Promise<CollectionResult<Note>> {
    try {
      const result = await this.getById(id);
      if (!result.data) {
        return result; // Will contain the error
      }

      const updatedNote = await this.update(id, {
        isPinned: !result.data.isPinned,
        isArchived: result.data.isPinned ? result.data.isArchived : false, // Unarchive when pinning
      });

      return updatedNote;
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to toggle pin status"),
        status: "error",
      };
    }
  },
};

// Project operations
export const projectService = {
  // Create a new project with optimistic updates
  async create(input: CreateProjectInput): Promise<CollectionResult<Project>> {
    try {
      const now = nowIso();
      const newProject: Project = {
        ...input,
        id: newId(),
        createdAt: now,
        updatedAt: now,
      };

      await baseProjectsCollection.insert(newProject);
      return {
        data: newProject,
        status: "success",
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to create project"),
        status: "error",
      };
    }
  },

  // Update a project with optimistic updates
  async update(
    id: string,
    input: UpdateProjectInput
  ): Promise<CollectionResult<Project>> {
    try {
      const current = await baseProjectsCollection.get(id);
      if (!current) {
        return {
          error: new Error("Project not found"),
          status: "error",
        };
      }

      const updated: Project = {
        ...current,
        ...input,
        updatedAt: nowIso(),
      };

      await baseProjectsCollection.update(id, (draft) => {
        Object.assign(draft, updated);
      });

      return {
        data: updated,
        status: "success",
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to update project"),
        status: "error",
      };
    }
  },

  // Delete a project with cleanup and optimistic updates
  async delete(id: string): Promise<CollectionResult<boolean>> {
    try {
      const exists = await baseProjectsCollection.get(id);
      if (!exists) {
        return {
          error: new Error("Project not found"),
          status: "error",
        };
      }

      // Remove project reference from all notes
      const notesResult = await noteService.getByProject(id);
      if (notesResult.status === "success" && notesResult.data) {
        await Promise.all(
          notesResult.data.map((note: Note) =>
            baseNotesCollection.update(note.id, (draft: Note) => {
              // Normalize array relation: remove the deleted project id
              const current = Array.isArray(draft.projectIds) ? draft.projectIds : [];
              draft.projectIds = current.filter((pid) => pid !== id);
              // Legacy cleanup
              if ((draft as Partial<Note>).projectId === id) {
                delete (draft as Partial<Note>).projectId;
              }
              draft.updatedAt = nowIso();
            })
          )
        );
      }

      await baseProjectsCollection.delete(id);
      return {
        data: true,
        status: "success",
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to delete project"),
        status: "error",
      };
    }
  },

  // Get single project by ID
  async getById(id: string): Promise<CollectionResult<Project>> {
    try {
      const project = await baseProjectsCollection.get(id);
      if (!project) {
        return {
          error: new Error("Project not found"),
          status: "error",
        };
      }
      return {
        data: project,
        status: "success",
      };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error : new Error("Failed to fetch project"),
        status: "error",
      };
    }
  },

  // Get all projects with reactive query
  async getAll(): Promise<CollectionResult<Project[]>> {
    try {
      const result: Project[] = await projectsCollection.toArray;
      return {
        data: result,
        status: "success",
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to fetch projects"),
        status: "error",
      };
    }
  },

  // Get project with notes count and stats
  async getProjectWithStats(projectId: string): Promise<
    CollectionResult<{
      id: string;
      name: string;
      description?: string;
      color?: string;
      createdAt: string;
      updatedAt: string;
      totalNotes: number;
      activeNotes: number;
      archivedNotes: number;
    }>
  > {
    try {
      const projectResult = await this.getById(projectId);
      if (!projectResult.data) {
        // Return a properly typed error response
        return {
          ...projectResult,
          data: undefined,
          error: projectResult.error || new Error("Project not found"),
        };
      }

      // Get all notes for this project
      const notesResult = await noteService.getByProject(projectId);
      if (!notesResult.data) {
        return {
          ...projectResult,
          data: {
            ...projectResult.data,
            createdAt: projectResult.data.createdAt,
            updatedAt: projectResult.data.updatedAt,
            totalNotes: 0,
            activeNotes: 0,
            archivedNotes: 0,
          },
        };
      }

      const notes = notesResult.data;
      const totalNotes = notes.length;
      const archivedNotes = notes.filter((note) => note.isArchived).length;
      const activeNotes = totalNotes - archivedNotes;

      return {
        data: {
          ...projectResult.data,
          id: projectResult.data.id.toString(),
          createdAt: projectResult.data.createdAt,
          updatedAt: projectResult.data.updatedAt,
          totalNotes,
          activeNotes,
          archivedNotes,
        },
        status: "success",
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to fetch project stats"),
        status: "error",
      };
    }
  },
};

// Export all services and collections
export * from "./db";
