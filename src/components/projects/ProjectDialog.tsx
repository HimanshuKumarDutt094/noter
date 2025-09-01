import { useEffect, useState } from "react";
import type { Project } from "@/collections/projects";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/shared/ColorPicker";
import type { ColorValue } from "@/lib/colors";

export type ProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSubmit: (values: Omit<Project, "id" | "createdAt" | "updatedAt">) => Promise<void> | void;
  title?: string;
};

export function ProjectDialog({ open, onOpenChange, project, onSubmit, title = "New Project" }: ProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [color, setColor] = useState<ColorValue>("#7c3aed" as ColorValue);

  useEffect(() => {
    if (project) {
      setName(project.name ?? "");
      setDescription(project.description ?? "");
      setExcerpt(project.excerpt ?? "");
      setColor((project.color as ColorValue) ?? ("#7c3aed" as ColorValue));
    } else {
      setName("");
      setDescription("");
      setExcerpt("");
      setColor("#7c3aed" as ColorValue);
    }
  }, [project, open]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await onSubmit({ name: name.trim(), description: description.trim() || undefined, excerpt: excerpt.trim() || undefined, color: color || undefined, categoryIds: [] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Input id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Short summary" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional longer description" />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker value={color} onChange={(c) => setColor(c)} />
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
