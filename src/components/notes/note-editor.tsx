import {
  type CreateNoteInput,
  type Note,
  type UpdateNoteInput,
} from "@/collections/notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tag } from "lucide-react";
import { useEffect, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { TagSelector } from "./tag-selector";
// legacy single category selector removed in favor of multi-select
import type { Category } from "@/collections/categories";
import type { Project } from "@/collections/projects";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { MultiSelect } from "@/components/ui/multi-select";
import { COLORS, HexColorSchema, type ColorValue } from "@/lib/colors";
import { baseCategoriesCollection, baseProjectsCollection } from "@/lib/db";
import { useLiveQuery } from "@tanstack/react-db";
import { toast } from "sonner";
import { z } from "zod/v4";

// Using centralized HexColorSchema from src/lib/colors.ts

// Dedicated form schema to match the editor fields exactly
const NoteFormSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(120, "Title must be 120 characters or less"),
  content: z.string().min(1).nonempty(),
  tagIds: z.array(z.string()),
  projectIds: z.array(z.string()),
  categoryIds: z.array(z.string()),
  color: HexColorSchema.optional(),
  isArchived: z.boolean(),
  isPinned: z.boolean(),
});

type NoteFormValues = z.infer<typeof NoteFormSchema>;

type NoteEditorProps = {
  note?: Note;
  onSave: (note: CreateNoteInput | UpdateNoteInput) => Promise<void>;
  onCancel: () => void;
  initialProjectIds?: string[];
  initialCategoryIds?: string[];
};

// Using centralized COLORS palette from src/lib/colors.ts

export function NoteEditor({
  note,
  onSave,
  onCancel,
  initialProjectIds = [],
  initialCategoryIds = [],
}: NoteEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(NoteFormSchema),
    defaultValues: {
      title: note?.title ?? "",
      content: note?.content ?? "",
      tagIds: note?.tagIds ?? [],
      // arrays are the single source of truth post-migration
      categoryIds: Array.isArray(note?.categoryIds)
        ? (note?.categoryIds as string[])
        : initialCategoryIds,
      color: note?.color ?? ("#ffffff" as ColorValue),
      projectIds: Array.isArray(note?.projectIds)
        ? (note?.projectIds as string[])
        : initialProjectIds,
      isArchived: note?.isArchived ?? false,
      isPinned: note?.isPinned ?? false,
    },
  });

  const { control, handleSubmit, setValue, reset } = form;

  // Live data for projects and categories
  const { data: allProjects = [] } = useLiveQuery((q) =>
    q
      .from({ project: baseProjectsCollection })
      .orderBy(({ project }) => project.name, "asc")
  ) as unknown as { data: Project[] };
  const { data: allCategories = [] } = useLiveQuery((q) =>
    q
      .from({ category: baseCategoriesCollection })
      .orderBy(({ category }) => category.name, "asc")
  ) as unknown as { data: Category[] };

  // Keep form in sync when editing an existing note changes
  useEffect(() => {
    reset({
      title: note?.title ?? "",
      content: note?.content ?? "",
      tagIds: note?.tagIds ?? [],
      categoryIds: Array.isArray(note?.categoryIds)
        ? (note?.categoryIds as string[])
        : initialCategoryIds,
      color: note?.color ?? "#ffffff",
      projectIds: Array.isArray(note?.projectIds)
        ? (note?.projectIds as string[])
        : initialProjectIds,
      isArchived: note?.isArchived ?? false,
      isPinned: note?.isPinned ?? false,
    });
    // We intentionally only depend on note identity and reset fn to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  const handleTagsChange = (tags: readonly string[]) => {
    // react-hook-form expects a mutable array; normalize from readonly
    setValue("tagIds", Array.from(tags), { shouldValidate: true });
  };

  // toggleArrayValue removed; MultiSelect handles array updates via setValue

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

          <div className="grid grid-cols-1 items-end md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <FormControl>
                    <div>
                      <MultiSelect
                        options={allProjects.map((p) => ({
                          value: p.id,
                          label: p.name,
                          left: p.color ? (
                            <span
                              className="inline-block h-3 w-3 rounded-full border"
                              style={{ backgroundColor: p.color }}
                              aria-hidden
                            />
                          ) : undefined,
                        }))}
                        value={field.value || []}
                        onChange={(v) =>
                          setValue("projectIds", v, { shouldValidate: true })
                        }
                        placeholder="Select projects"
                      />
                    </div>
                  </FormControl>
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
                  <FormControl>
                    <MultiSelect
                      options={allCategories.map((c) => ({
                        value: c.id,
                        label: c.name,
                        left: c.color ? (
                          <span
                            className="inline-block h-3 w-3 rounded-full border"
                            style={{ backgroundColor: c.color }}
                            aria-hidden
                          />
                        ) : undefined,
                      }))}
                      value={field.value || []}
                      onChange={(v) =>
                        setValue("categoryIds", v, { shouldValidate: true })
                      }
                      placeholder="Select categories"
                    />
                  </FormControl>
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
                          style={{ backgroundColor: field.value as ColorValue }}
                        />
                      </Button>
                      {showColorPicker && (
                        <div className="absolute z-[1000] mt-2 p-4 bg-popover border rounded-lg shadow-xl min-w-[200px]">
                          <div className="grid grid-cols-4 gap-3">
                            {COLORS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className={cn(
                                  "h-8 w-8 rounded-full border-2 border-background transition-all hover:scale-110",
                                  field.value === (opt.value as string) &&
                                    "ring-2 ring-offset-2 ring-primary scale-110"
                                )}
                                style={{ backgroundColor: opt.value }}
                                onClick={() => {
                                  field.onChange(opt.value as ColorValue);
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
