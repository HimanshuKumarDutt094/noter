import { Suspense, lazy } from "react";
import { Navigate, createBrowserRouter, type RouteObject } from "react-router";
import ErrorPage from "./error-page";
import { NotFoundPage } from "./pages/not-found-page";

// Lazy route elements (wrap named exports into default for React.lazy)
const HomePage = lazy(() =>
  import("./pages/home-page").then((m) => ({ default: m.HomePage }))
);
const ImportView = lazy(() =>
  import("./pages/import-view").then((m) => ({ default: m.ImportView }))
);
const NoteView = lazy(() =>
  import("./pages/notes/note-view").then((m) => ({ default: m.NoteView }))
);
const ProjectView = lazy(() =>
  import("./pages/projects/project-view").then((m) => ({
    default: m.ProjectView,
  }))
);
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
