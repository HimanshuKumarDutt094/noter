import { Navigate, useParams } from "react-router";
import { routes } from "@/routes/routePaths";

export default function NoteEditPage() {
  const { noteId } = useParams<{ noteId: string }>();
  if (!noteId) {
    return <Navigate to={routes.notes.index()} replace />;
  }
  return <Navigate to={routes.notes.editQuery(noteId)} replace />;
}
