export const routes = {
  home: () => "/",
  homeProjectsTab: () => "/?tab=projects",
  import: () => "/import",
  notes: {
    index: () => "/notes",
    view: (id: string) => `/notes/${id}`,
    newWithProject: (projectId: string) => `/notes?new=1&projectId=${projectId}`,
    editQuery: (id: string) => `/notes?edit=${id}`,
  },
  projects: {
    view: (id: string) => `/projects/${id}`,
  },
} as const;
