import type { Note } from "@/collections/notes";

function hasAny<T>(source: ReadonlyArray<T> | undefined, targets: ReadonlyArray<T> | undefined): boolean {
  if (!source || source.length === 0) return false;
  if (!targets || targets.length === 0) return false;
  const set = new Set(source);
  for (const t of targets) {
    if (set.has(t)) return true;
  }
  return false;
}

export function noteMatchesProject(note: Note, projectId: string): boolean {
  if (!projectId) return false;
  if (Array.isArray(note.projectIds) && note.projectIds.includes(projectId)) return true;
  return note.projectId === projectId;
}

export function noteMatchesAnyProject(note: Note, projectIds: ReadonlyArray<string>): boolean {
  if (!projectIds || projectIds.length === 0) return true;
  // Array path first
  if (Array.isArray(note.projectIds) && hasAny(note.projectIds, projectIds)) return true;
  // Legacy single path
  return note.projectId ? projectIds.includes(note.projectId) : false;
}

export function noteMatchesAnyCategory(note: Note, categoryIds: ReadonlyArray<string>): boolean {
  if (!categoryIds || categoryIds.length === 0) return true;
  if (Array.isArray(note.categoryIds) && hasAny(note.categoryIds, categoryIds)) return true;
  return note.categoryId ? categoryIds.includes(note.categoryId) : false;
}

export function noteMatchesAnyTag(note: Note, tagIds: ReadonlyArray<string>): boolean {
  if (!tagIds || tagIds.length === 0) return true;
  return Array.isArray(note.tagIds) && hasAny(note.tagIds, tagIds);
}

export function noteMatchesText(note: Note, text: string): boolean {
  const q = text.trim().toLowerCase();
  if (!q) return true;
  return (
    note.title.toLowerCase().includes(q) ||
    note.content.toLowerCase().includes(q)
  );
}

export type NoteFilter = {
  text?: string;
  tagIds?: ReadonlyArray<string>;
  categoryIds?: ReadonlyArray<string>;
  projectIds?: ReadonlyArray<string>;
};

export function filterNotes(notes: ReadonlyArray<Note>, f: NoteFilter): Note[] {
  const text = f.text ?? "";
  const tagIds = f.tagIds ?? [];
  const categoryIds = f.categoryIds ?? [];
  const projectIds = f.projectIds ?? [];

  return notes.filter((n) =>
    noteMatchesText(n, text) &&
    noteMatchesAnyTag(n, tagIds) &&
    noteMatchesAnyCategory(n, categoryIds) &&
    noteMatchesAnyProject(n, projectIds)
  );
}
