import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NotesPage } from "./notes/NotesPage";
import { ProjectsPage } from "./projects/ProjectsPage";

export function HomePage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <Tabs defaultValue="notes">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Home</h1>
          <TabsList>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="notes" className="mt-0">
          <NotesPage />
        </TabsContent>
        <TabsContent value="projects" className="mt-0">
          <ProjectsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
