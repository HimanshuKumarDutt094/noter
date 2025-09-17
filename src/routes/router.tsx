import { Suspense } from "react";
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
    element: (
      <Suspense
        fallback={
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        }
      >
        <HomePage />
      </Suspense>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: "/import",
    element: (
      <Suspense
        fallback={
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        }
      >
        <ImportView />
      </Suspense>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: "/notes",
    children: [
      {
        // Keep direct note view (deep link) available at /notes/:noteId
        path: ":noteId",
        element: (
          <Suspense
            fallback={
              <div className="p-4 text-sm text-muted-foreground">Loading…</div>
            }
          >
            <NoteView />
          </Suspense>
        ),
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
        element: (
          <Suspense
            fallback={
              <div className="p-4 text-sm text-muted-foreground">Loading…</div>
            }
          >
            <ProjectView />
          </Suspense>
        ),
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
