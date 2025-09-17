import { ModeToggle } from "@/components/shared/mode-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// eager render — no Suspense required
import { useSearchParams } from "react-router";

import { NotesPage } from "./notes/notes-page";
import { ProjectsPage } from "./projects/projects-page";

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (
    searchParams.get("tab") === "projects" ? "projects" : "notes"
  ) as "notes" | "projects";

  return (
    <div className="relative">
      {/* Ambient gradient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[260px] bg-[radial-gradient(60%_80%_at_50%_0%,_oklch(0.97_0_0/_0.9),_transparent_70%)] dark:bg-[radial-gradient(60%_80%_at_50%_0%,_oklch(0.25_0_0/_0.6),_transparent_70%)]"
      />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Tabs
          value={currentTab}
          onValueChange={(value) =>
            setSearchParams(
              (prev) => {
                const sp = new URLSearchParams(prev);
                sp.set("tab", value);
                return sp;
              },
              { replace: true }
            )
          }
        >
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Home</h1>
              <div className="hidden sm:block h-6 w-px bg-border" />
              <TabsList>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
              </TabsList>
            </div>
            <ModeToggle />
          </div>
          <TabsContent value="notes" className="mt-0">
            <NotesPage />
          </TabsContent>
          <TabsContent value="projects" className="mt-0">
            <ProjectsPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
