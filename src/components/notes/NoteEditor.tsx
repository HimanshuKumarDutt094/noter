import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SubmitHandler } from "react-hook-form";
import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Note,
  type CreateNoteInput,
  type UpdateNoteInput,
} from "@/collections/notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagSelector } from "./TagSelector";
// legacy single category selector removed in favor of multi-select
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod/v4";
import { useLiveQuery } from "@tanstack/react-db";
import { categoriesCollection, projectsCollection } from "@/lib/db";
import { Checkbox } from "@/components/ui/checkbox";

// Dedicated form schema to match the editor fields exactly
const NoteFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1).nonempty(),
  tagIds: z.array(z.string()),
  projectIds: z.array(z.string()),
  categoryIds: z.array(z.string()),
  color: z.string().nonempty(),
  isArchived: z.boolean(),
  isPinned: z.boolean(),
});

type NoteFormValues = z.infer<typeof NoteFormSchema>;

type NoteEditorProps = {
  note?: Note;
  onSave: (note: CreateNoteInput | UpdateNoteInput) => Promise<void>;
  onCancel: () => void;
};

const COLORS = [
  "#fef2f2",
  "#ffedd5",
  "#fef9c3",
  "#ecfccb",
  "#e0f2fe",
  "#e0e7ff",
  "#f3e8ff",
  "#fce7f3",
];

export function NoteEditor({ note, onSave, onCancel }: NoteEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(NoteFormSchema),
    defaultValues: {
      title: note?.title ?? "",
      content: note?.content ?? "",
      tagIds: note?.tagIds ?? [],
      // backfill legacy single fields into arrays
      categoryIds: Array.isArray(note?.categoryIds)
        ? (note?.categoryIds as string[])
        : note?.categoryId
        ? [note.categoryId]
        : [],
      color: note?.color ?? "#ffffff",
      projectIds: Array.isArray(note?.projectIds)
        ? (note?.projectIds as string[])
        : note?.projectId
        ? [note.projectId]
        : [],
      isArchived: note?.isArchived ?? false,
      isPinned: note?.isPinned ?? false,
    },
  });

  const { control, handleSubmit, setValue, reset } = form;

  // Live data for projects and categories
  const { data: allProjects = [] } = useLiveQuery(projectsCollection) as {
    data: { id: string; name: string; color?: string }[];
  };
  const { data: allCategories = [] } = useLiveQuery(categoriesCollection) as {
    data: { id: string; name: string; color?: string }[];
  };

  // Keep form in sync when editing an existing note changes
  useEffect(() => {
    reset({
      title: note?.title ?? "",
      content: note?.content ?? "",
      tagIds: note?.tagIds ?? [],
      categoryIds: Array.isArray(note?.categoryIds)
        ? (note?.categoryIds as string[])
        : note?.categoryId
        ? [note.categoryId]
        : [],
      color: note?.color ?? "#ffffff",
      projectIds: Array.isArray(note?.projectIds)
        ? (note?.projectIds as string[])
        : note?.projectId
        ? [note.projectId]
        : [],
      isArchived: note?.isArchived ?? false,
      isPinned: note?.isPinned ?? false,
    });
    // We intentionally only depend on note identity and reset fn to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  const handleTagsChange = (tagIds: string[]) => {
    setValue("tagIds", tagIds, { shouldValidate: true });
  };

  const toggleArrayValue = (
    fieldName: "projectIds" | "categoryIds",
    id: string,
    checked: boolean
  ) => {
    const current = (form.getValues(fieldName) || []) as string[];
    const next = checked
      ? current.includes(id)
        ? current
        : [...current, id]
      : current.filter((x) => x !== id);
    setValue(fieldName, next, { shouldValidate: true });
  };

  const onSubmit: SubmitHandler<NoteFormValues> = async (formData) => {
    try {
      setIsSubmitting(true);
      const noteData = {
        ...(note?.id ? { id: note.id } : {}),
        title: formData.title,
        content: formData.content,
        tagIds: formData.tagIds,
        // submit arrays (NotesPage handles persistence/backfill)
        categoryIds: formData.categoryIds ?? [],
        color: formData.color,
        isArchived: formData.isArchived,
        isPinned: formData.isPinned,
        projectIds: formData.projectIds ?? [],
      } as const;

      await onSave(noteData as CreateNoteInput | UpdateNoteInput);

      toast.success(note?.id ? "Note updated" : "Note created", {
        description: `"${formData.title}" has been ${
          note?.id ? "updated" : "created"
        } successfully.`,
      });
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error(
        `Failed to ${note?.id ? "update" : "create"} note. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-4">
          <FormField
            control={control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="Title"
                    className="text-xl font-semibold border-none shadow-none focus-visible:ring-0"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Start writing..."
                    className="min-h-[200px] resize-none border-none shadow-none focus-visible:ring-0"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              control={control}
              name="tagIds"
              render={({ field }) => (
                <FormItem className="md:col-span-2 lg:col-span-1">
                  <FormLabel className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </FormLabel>
                  <FormControl>
                    <TagSelector
                      selectedTags={field.value || []}
                      onTagsChange={handleTagsChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="projectIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-muted-foreground">
                    Projects
                  </FormLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allProjects.map((p) => {
                      const checked = (field.value || []).includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 text-sm border rounded-md px-2 py-1 cursor-pointer"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(val) =>
                              toggleArrayValue("projectIds", p.id, val === true)
                            }
                          />
                          {p.color && (
                            <span
                              className="inline-block h-3 w-3 rounded-full border"
                              style={{ backgroundColor: p.color }}
                              aria-hidden
                            />
                          )}
                          <span className="truncate" title={p.name}>
                            {p.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="categoryIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-muted-foreground">
                    Categories
                  </FormLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allCategories.map((c) => {
                      const checked = (field.value || []).includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 text-sm border rounded-md px-2 py-1 cursor-pointer"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(val) =>
                              toggleArrayValue(
                                "categoryIds",
                                c.id,
                                val === true
                              )
                            }
                          />
                          {c.color && (
                            <span
                              className="inline-block h-3 w-3 rounded-full border"
                              style={{ backgroundColor: c.color }}
                              aria-hidden
                            />
                          )}
                          <span className="truncate" title={c.name}>
                            {c.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="color"
              render={({ field }) => (
                <FormItem className="md:col-span-2 lg:col-span-1">
                  <FormLabel className="text-sm font-medium text-muted-foreground">
                    Color
                  </FormLabel>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0 rounded-full"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                      >
                        <div
                          className="w-6 h-6 rounded-full border-2 border-background"
                          style={{ backgroundColor: field.value }}
                        />
                      </Button>
                      {showColorPicker && (
                        <div className="absolute z-[1000] mt-2 p-4 bg-popover border rounded-lg shadow-xl min-w-[200px]">
                          <div className="grid grid-cols-4 gap-3">
                            {COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={cn(
                                  "h-8 w-8 rounded-full border-2 border-background transition-all hover:scale-110",
                                  field.value === color &&
                                    "ring-2 ring-offset-2 ring-primary scale-110"
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                  field.onChange(color);
                                  setShowColorPicker(false);
                                }}
                              />
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs"
                              onClick={() => setShowColorPicker(false)}
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Click to change
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="order-2 sm:order-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="order-1 sm:order-2"
          >
            {isSubmitting
              ? note?.id
                ? "Updating..."
                : "Creating..."
              : note?.id
              ? "Update"
              : "Create"}{" "}
            Note
          </Button>
        </div>
      </form>
    </Form>
  );
}
