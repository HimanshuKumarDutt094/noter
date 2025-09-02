import { createBrowserRouter, type RouteObject, Navigate } from "react-router";
import { Suspense, lazy } from "react";
import { NotFoundPage } from "./pages/NotFoundPage";
import ErrorPage from "./ErrorPage";

// Lazy route elements (wrap named exports into default for React.lazy)
const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const ImportView = lazy(() => import("./pages/ImportView").then((m) => ({ default: m.ImportView })));
const NotesPage = lazy(() => import("./pages/notes/NotesPage").then((m) => ({ default: m.NotesPage })));
const NoteView = lazy(() => import("./pages/notes/NoteView").then((m) => ({ default: m.NoteView })));
const ProjectView = lazy(() => import("./pages/projects/ProjectView").then((m) => ({ default: m.ProjectView })));
// Note editing is handled via dialog on NotesPage using query params.

/**
 * Application routes configuration
 */
const routeConfig: RouteObject[] = [
  {
    path: "/",
    element: (
      <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
        <HomePage />
      </Suspense>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: "/import",
    element: (
      <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
        <ImportView />
      </Suspense>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: "/notes",
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
            <NotesPage />
          </Suspense>
        ),
        errorElement: <ErrorPage />,
      },
      {
        path: ":noteId",
        element: (
          <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
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
          <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
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
