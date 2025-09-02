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

// --- Normalizers (centralize legacy single-field compatibility) ---
function normalizedProjectIds(note: Note): ReadonlyArray<string> {
  if (Array.isArray(note.projectIds)) return note.projectIds;
  return note.projectId ? [note.projectId] : [];
}

function normalizedCategoryIds(note: Note): ReadonlyArray<string> {
  if (Array.isArray(note.categoryIds)) return note.categoryIds;
  return note.categoryId ? [note.categoryId] : [];
}

// --- Curried predicates for composability ---
export const byProject = (projectId: string) => (note: Note): boolean => {
  if (!projectId) return false;
  return normalizedProjectIds(note).includes(projectId);
};

export const byAnyProject = (projectIds: ReadonlyArray<string>) => (note: Note): boolean => {
  if (!projectIds || projectIds.length === 0) return true;
  return hasAny(normalizedProjectIds(note), projectIds);
};

export const byAnyCategory = (categoryIds: ReadonlyArray<string>) => (note: Note): boolean => {
  if (!categoryIds || categoryIds.length === 0) return true;
  return hasAny(normalizedCategoryIds(note), categoryIds);
};

export const byAnyTag = (tagIds: ReadonlyArray<string>) => (note: Note): boolean => {
  if (!tagIds || tagIds.length === 0) return true;
  return Array.isArray(note.tagIds) && hasAny(note.tagIds, tagIds);
};

export const byText = (text: string) => (note: Note): boolean => {
  const q = text.trim().toLowerCase();
  if (!q) return true;
  return note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q);
};

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

  const predicates = [
    byText(text),
    byAnyTag(tagIds),
    byAnyCategory(categoryIds),
    byAnyProject(projectIds),
  ];

  return notes.filter((n) => predicates.every((p) => p(n)));
}
