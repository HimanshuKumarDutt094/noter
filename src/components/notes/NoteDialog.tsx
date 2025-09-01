import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { projectsCollection, categoriesCollection } from "@/lib/db";
import { TagInput } from "@/components/ui/tag-input";
import type { Note } from "@/collections/notes";
import type { Category } from "@/collections/categories";

type NoteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: Partial<Note>;
  onSave: (note: Partial<Note>) => void;
  onDelete?: (id: string) => void;
  isImportMode?: boolean;
};

export function NoteDialog({
  open,
  onOpenChange,
  note: initialNote,
  onSave,
  onDelete,
  isImportMode = false,
}: NoteDialogProps) {
  const [title, setTitle] = useState(initialNote?.title || "");
  const [content, setContent] = useState(initialNote?.content || "");
  const [tags, setTags] = useState<string[]>(initialNote?.tagIds || []);
  const [isPinned, setIsPinned] = useState(initialNote?.isPinned || false);
  const [projectIds, setProjectIds] = useState<string[]>(
    Array.isArray(initialNote?.projectIds)
      ? (initialNote?.projectIds as string[])
      : initialNote?.projectId
      ? [initialNote.projectId]
      : []
  );
  const [categoryIds, setCategoryIds] = useState<string[]>(
    Array.isArray(initialNote?.categoryIds)
      ? (initialNote?.categoryIds as string[])
      : initialNote?.categoryId
      ? [initialNote.categoryId]
      : []
  );

  const { data: allProjects = [] } = useLiveQuery(projectsCollection) as { data: { id: string; name: string; color?: string }[] };
  const { data: allCategories = [] } = useLiveQuery(categoriesCollection) as { data: Category[] };

  // Reset form when note changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      setTitle(initialNote?.title || "");
      setContent(initialNote?.content || "");
      setTags(initialNote?.tagIds || []);
      setIsPinned(initialNote?.isPinned || false);
      setProjectIds(
        Array.isArray(initialNote?.projectIds)
          ? (initialNote?.projectIds as string[])
          : initialNote?.projectId
          ? [initialNote.projectId]
          : []
      );
      setCategoryIds(
        Array.isArray(initialNote?.categoryIds)
          ? (initialNote?.categoryIds as string[])
          : initialNote?.categoryId
          ? [initialNote.categoryId]
          : []
      );
    }
  }, [open, initialNote]);

  const handleSave = () => {
    const updatedNote: Partial<Note> = {
      ...initialNote,
      title: title.trim(),
      content: content.trim(),
      tagIds: tags,
      isPinned,
      updatedAt: new Date().toISOString(),
      projectIds: projectIds,
      categoryIds: categoryIds,
    };

    if (!updatedNote.title) {
      updatedNote.title = "Untitled Note";
    }

    onSave(updatedNote);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (onDelete && initialNote?.id) {
      onDelete(initialNote.id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl z-[100]">
        <DialogHeader>
          <DialogTitle>
            {isImportMode
              ? "Import Notes"
              : initialNote?.id
              ? "Edit Note"
              : "New Note"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              className="w-full"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="content">Content</Label>
              {!isImportMode && (
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="pinned"
                    className="text-sm text-muted-foreground"
                  >
                    Pin note
                  </Label>
                  <input
                    id="pinned"
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note here..."
              className="min-h-[200px] w-full"
            />
          </div>

          <div className="grid gap-2">
            <Label>Tags</Label>
            <TagInput
              placeholder="Add tags..."
              tags={tags}
              onTagsChange={setTags}
              maxTags={5}
              className="w-full"
            />
          </div>

          <div className="grid gap-2">
            <Label>Projects</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allProjects.map((p) => {
                const checked = projectIds.includes(p.id);
                return (
                  <label key={p.id} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1 cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(val) => {
                        const isChecked = val === true;
                        setProjectIds((prev) => {
                          if (isChecked) return prev.includes(p.id) ? prev : [...prev, p.id];
                          return prev.filter((id) => id !== p.id);
                        });
                      }}
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
            <Label>Categories</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allCategories.map((c) => {
                const checked = categoryIds.includes(c.id);
                return (
                  <label key={c.id} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1 cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(val) => {
                        const isChecked = val === true;
                        setCategoryIds((prev) => {
                          if (isChecked) return prev.includes(c.id) ? prev : [...prev, c.id];
                          return prev.filter((id) => id !== c.id);
                        });
                      }}
                    />
                    {c.color && (
                      <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: c.color }} aria-hidden />
                    )}
                    <span className="truncate" title={c.name}>{c.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <div>
            {!isImportMode && initialNote?.id && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="mr-2"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              {isImportMode ? "Import Note" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
