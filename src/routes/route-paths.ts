export const routes = {
  home: () => "/",
  homeProjectsTab: () => "/?tab=projects",
  import: () => "/import",
  notes: {
    // Notes index is the root page (home) — remove duplicate /notes index route
    index: () => "/",
    view: (id: string) => `/notes/${id}`,
    // Use query-only paths so callers can set the new/edit flags on the
    // current location instead of navigating to the /notes base path.
    newWithProject: (projectId: string) => `?new=1&projectId=${projectId}`,
    editQuery: (id: string) => `?edit=${id}`,
  },
  projects: {
    view: (id: string) => `/projects/${id}`,
  },
} as const;
