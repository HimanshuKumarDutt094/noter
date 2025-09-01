import { createBrowserRouter, type RouteObject } from "react-router";
import { NotFoundPage } from "./pages/NotFoundPage";
import { NotesPage } from "./pages/notes/NotesPage";
import { NoteView } from "./pages/notes/NoteView";
import { ImportView } from "./pages/ImportView";
import { HomePage } from "./pages/HomePage";

/**
 * Application routes configuration
 */
const routeConfig: RouteObject[] = [
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/import",
    element: <ImportView />,
  },
  {
    path: "/notes",
    children: [
      { index: true, element: <NotesPage /> },
      { path: ":noteId", element: <NoteView /> },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
];

/**
 * Application router instance
 */
export const router = createBrowserRouter(routeConfig);
