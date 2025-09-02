import { useCallback, useEffect, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { projectsCollection } from "@/lib/db";
import type { Note } from "@/collections/notes";
import { ArrowRightLeft } from "lucide-react";
import type { Project } from "@/collections/projects";

export type MoveNotePayload = {
  noteId: string;
  projectIds: string[];
  keepCategories: boolean;
  keepTags: boolean;
};

type MoveNoteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: Note | null;
  onMove: (payload: MoveNotePayload) => void;
};

export function MoveNoteDialog({ open, onOpenChange, note, onMove }: MoveNoteDialogProps) {
  const { data: allProjects = [] } = useLiveQuery(projectsCollection) as {
    data: Project[];
  };

  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [keepCategories, setKeepCategories] = useState(true);
  const [keepTags, setKeepTags] = useState(true);

  useEffect(() => {
    if (open && note) {
      setSelectedProjectIds(Array.isArray(note.projectIds) ? note.projectIds : []);
      setKeepCategories(true);
      setKeepTags(true);
    }
  }, [open, note]);

  const handleConfirm = useCallback(() => {
    if (!note) return;
    onMove({
      noteId: note.id,
      projectIds: selectedProjectIds,
      keepCategories,
      keepTags,
    });
    onOpenChange(false);
  }, [keepCategories, keepTags, note, onMove, onOpenChange, selectedProjectIds]);

  const toggleProject = useCallback((projectId: string, isChecked: boolean) => {
    setSelectedProjectIds((prev) => {
      if (isChecked) return prev.includes(projectId) ? prev : [...prev, projectId];
      return prev.filter((id) => id !== projectId);
    });
  }, []);

  const handleKeepCategoriesChange = useCallback((v: boolean | "indeterminate") => setKeepCategories(v === true), []);
  const handleKeepTagsChange = useCallback((v: boolean | "indeterminate") => setKeepTags(v === true), []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" /> Move Note
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Target projects</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allProjects.map((p) => {
                const checked = selectedProjectIds.includes(p.id);
                return (
                  <label key={p.id} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1 cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(val) => toggleProject(p.id, val === true)}
                    />
                    {p.color && (
                      <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: p.color }} aria-hidden />
                    )}
                    <span className="truncate" title={p.name}>{p.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Options</Label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={keepCategories} onCheckedChange={handleKeepCategoriesChange} />
              Keep categories
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={keepTags} onCheckedChange={handleKeepTagsChange} />
              Keep tags
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!selectedProjectIds.length}>Move</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
