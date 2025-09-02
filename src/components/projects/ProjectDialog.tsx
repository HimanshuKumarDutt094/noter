import { useCallback, useEffect, useMemo, useState } from "react";
import type { Project, CreateProjectInput } from "@/collections/projects";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/shared/ColorPicker";
import { COLORS, type ColorValue } from "@/lib/colors";
import { useLiveQuery } from "@tanstack/react-db";
import { projectsCollection } from "@/lib/db";
import { toast } from "sonner";

export type ProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSubmit: (values: CreateProjectInput) => Promise<void> | void;
  title?: string;
};

export function ProjectDialog({ open, onOpenChange, project, onSubmit, title = "New Project" }: ProjectDialogProps) {
  const defaultColor: ColorValue = useMemo(() => {
    const indigo = COLORS.find((c) => c.name === "Indigo")?.value;
    return (indigo ?? COLORS[0].value) as ColorValue;
  }, []);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [color, setColor] = useState<ColorValue>(defaultColor);

  const { data: allProjects = [] } = useLiveQuery(projectsCollection) as { data: Project[] };

  useEffect(() => {
    if (project) {
      setName(project.name ?? "");
      setDescription(project.description ?? "");
      setExcerpt(project.excerpt ?? "");
      setColor((project.color as ColorValue) ?? defaultColor);
    } else {
      setName("");
      setDescription("");
      setExcerpt("");
      setColor(defaultColor);
    }
  }, [project, open, defaultColor]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value), []);
  const handleExcerptChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setExcerpt(e.target.value), []);
  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value), []);
  const handleColorChange = useCallback((c: ColorValue) => setColor(c), []);

  const handleSubmit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const duplicate = allProjects.some((p) => p.name.trim().toLowerCase() === trimmed.toLowerCase() && p.id !== project?.id);
    if (duplicate) {
      toast.error("Project name already exists", { description: "Please choose a different name." });
      return;
    }

    await onSubmit({
      name: trimmed,
      description: description.trim() || undefined,
      excerpt: excerpt.trim() || undefined,
      color: color || undefined,
      categoryIds: [],
    });
    onOpenChange(false);
  }, [allProjects, color, description, excerpt, name, onOpenChange, onSubmit, project?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={handleNameChange} placeholder="Project name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Input id="excerpt" value={excerpt} onChange={handleExcerptChange} placeholder="Short summary" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={handleDescriptionChange} placeholder="Optional longer description" />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker value={color} onChange={handleColorChange} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
