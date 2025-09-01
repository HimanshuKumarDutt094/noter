import { notesCollection } from "@/lib/db";

export async function notesLoader() {
  try {
    const result = notesCollection.toArray;
    return { notes: result };
  } catch (error) {
    console.error("Error loading notes:", error);
    return { notes: [], error: "Failed to load notes" };
  }
}

export type NotesLoaderData = Awaited<ReturnType<typeof notesLoader>>;
