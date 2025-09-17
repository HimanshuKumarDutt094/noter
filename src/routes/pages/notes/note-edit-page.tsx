import { routes } from "@/routes/route-paths";
import { Navigate, useParams } from "react-router";

export default function NoteEditPage() {
  const { noteId } = useParams<{ noteId: string }>();
  if (!noteId) {
    return <Navigate to={routes.home()} replace />;
  }
  return <Navigate to={routes.notes.editQuery(noteId)} replace />;
}
