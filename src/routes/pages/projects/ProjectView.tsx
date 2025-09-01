import { useParams } from "react-router";
import { useLiveQuery, eq, and } from "@tanstack/react-db";
import { projectsCollection, notesCollection } from "@/lib/db";
import type { Note } from "@/collections/notes";
import { NoteList } from "@/components/notes/NoteList";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";

export function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const { data: [project] = [] } = useLiveQuery((q) =>
    q
      .from({ project: projectsCollection })
      .where(({ project }) => eq(project.id, projectId))
      .select(({ project }) => project)
  );

  const { data: notes = [] } = useLiveQuery((q) =>
    q
      .from({ note: notesCollection })
      .where(({ note }) => and(eq(note.projectId, projectId), eq(note.isArchived, false)))
      .orderBy(({ note }) => note.updatedAt, "desc")
      .select(({ note }) => note)
  ) as { data: Note[] };

  if (!project || !projectId) {
    return (
      <div className="p-4">
        <p>Loading project...</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{project?.name || 'Project'}</h1>
          {project?.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="space-x-2">
          <Button onClick={() => navigate(`/notes/new?projectId=${projectId || ''}`)}>
            Add Note
          </Button>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Notes in this project</h2>
        <NoteList 
          notes={notes} 
          onEditNote={(id) => navigate(`/notes/${id}`)}
          onDeleteNote={() => {}}
          onTogglePin={() => {}}
          onArchiveNote={() => {}}
          onAddNote={() => navigate('/notes/new')}
          onImportNotes={() => {}}
        />
      </div>
    </div>
  );
}
