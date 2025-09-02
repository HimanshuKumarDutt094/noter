import type { Note } from "@/collections/notes";

export type NoteSortBy = "newest" | "oldest" | "title";

export function sortNotes(notes: ReadonlyArray<Note>, sortBy: NoteSortBy): Note[] {
  const arr = [...notes];
  switch (sortBy) {
    case "newest":
      return arr.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    case "oldest":
      return arr.sort(
        (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      );
    case "title":
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return arr;
  }
}
