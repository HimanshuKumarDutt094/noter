// Eager routes — no Suspense needed
import { Navigate, createBrowserRouter, type RouteObject } from "react-router";
import ErrorPage from "./error-page";
import { NotFoundPage } from "./pages/not-found-page";

import { HomePage } from "./pages/home-page";
import { ImportView } from "./pages/import-view";
import { NoteView } from "./pages/notes/note-view";
import { ProjectView } from "./pages/projects/project-view";
// Note editing is handled via dialog on NotesPage using query params.

/**
 * Application routes configuration
 */
const routeConfig: RouteObject[] = [
  {
    path: "/",
    element: <HomePage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/import",
    element: <ImportView />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/notes",
    children: [
      {
        // Keep direct note view (deep link) available at /notes/:noteId
        path: ":noteId",
        element: <NoteView />,
        errorElement: <ErrorPage />,
      },
    ],
  },
  {
    path: "/project",
    element: <Navigate to="/projects" replace />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/projects",
    children: [
      {
        index: true,
        element: <Navigate to="/?tab=projects" replace />,
        errorElement: <ErrorPage />,
      },
      {
        path: ":projectId",
        element: <ProjectView />,
        errorElement: <ErrorPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
    errorElement: <ErrorPage />,
  },
];

/**
 * Application router instance
 */
export const router = createBrowserRouter(routeConfig);
