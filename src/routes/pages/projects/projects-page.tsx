import type { CreateProjectInput } from "@/collections/projects";
import { ProjectDialog } from "@/components/projects/project-dialog";
import { ProjectsList } from "@/components/projects/projects-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { baseNotesCollection, baseProjectsCollection } from "@/lib/db";
import { filterNotes } from "@/lib/filters";
import { newId } from "@/lib/id";
import { nowIso } from "@/lib/time";
import { routes } from "@/routes/route-paths";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

export function ProjectsPage() {
  const navigate = useNavigate();
  const PAGE_SIZE = 50;
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: projects = [] } = useLiveQuery((q) =>
    q
      .from({ project: baseProjectsCollection })
      .orderBy(({ project }) => project.name, "asc")
      .limit(limit)
  );

  const { data: allNotes = [] } = useLiveQuery((q) =>
    q
      .from({ note: baseNotesCollection })
      .where(({ note }) => eq(note.isArchived, false))
      .orderBy(({ note }) => note.updatedAt, "desc")
  );

  // Infinite scroll sentinel for projects list
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setLimit((l) => l + PAGE_SIZE);
        });
      },
      { root: null, rootMargin: "200px", threshold: 0.1 }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [sentinel]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
    );
  }, [projects, search]);

  // notes are filtered in ProjectNotesPanel

  const hasNotes = allNotes.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div
        className={
          hasNotes
            ? "lg:col-span-12 xl:col-span-12 space-y-4"
            : "lg:col-span-5 xl:col-span-4 space-y-4"
        }
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Projects</h2>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            New Project
          </Button>
        </div>
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10"
        />
        <ProjectsList
          projects={filteredProjects}
          getNoteCount={(id) =>
            filterNotes(allNotes, { projectIds: [id] }).length
          }
          onSelectProject={(id) => navigate(routes.projects.view(id))}
        />
        <div ref={setSentinel} />
        <ProjectDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={async (values: CreateProjectInput) => {
            const now = nowIso();
            baseProjectsCollection.insert({
              ...values,
              categoryIds: values.categoryIds ? [...values.categoryIds] : [],
              id: newId(),
              createdAt: now,
              updatedAt: now,
            });
          }}
          title="New Project"
        />
      </div>
      {!hasNotes && (
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="h-full flex items-center justify-center text-muted-foreground border rounded-md p-8">
            Select a project to view its notes
          </div>
        </div>
      )}
    </div>
  );
}
