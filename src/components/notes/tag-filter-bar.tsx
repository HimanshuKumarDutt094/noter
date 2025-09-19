import {
  createDefaultPreferences,
  type Preferences,
} from "@/collections/preferences";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { basePreferencesCollection } from "@/lib/db";
import { nowIso } from "@/lib/time";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLiveQuery } from "@tanstack/react-db";
import { ChevronDown, ChevronUp, Star } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

export type TagFilterBarProps = {
  allTags: readonly string[];
  activeTag: string | null;
  onChangeActive: (tag: string | null) => void;
};

export function TagFilterBar({
  allTags,
  activeTag,
  onChangeActive,
}: TagFilterBarProps) {
  // Live query for preferences (single-row basePreferencesCollection)
  const { data = [], isLoading } = useLiveQuery((q) =>
    q.from({ preference: basePreferencesCollection })
  );

  const prefs: Preferences | null = data[0] ?? null;

  // Ensure a default preferences row exists once data is loaded
  useEffect(() => {
    if (isLoading) return;
    if (!prefs) {
      (async () => {
        try {
          const def = createDefaultPreferences();
          basePreferencesCollection.insert(def);
        } catch (e: unknown) {
          // Swallow insert races; another tab/render may have inserted
          console.warn(
            "Failed to insert default preferences (possibly exists)",
            e
          );
        }
      })();
    }
  }, [isLoading, prefs]);

  const updatePrefs = useCallback(
    async (updater: (draft: Preferences) => void) => {
      const current = prefs ?? createDefaultPreferences();
      const updated: Preferences = { ...current };
      updater(updated);
      updated.updatedAt = nowIso();

      // Upsert semantics: update if exists, otherwise insert
      if (prefs) {
        basePreferencesCollection.update(updated.id, (draft) => {
          Object.assign(draft, updated);
        });
      } else {
        basePreferencesCollection.insert(updated);
      }
    },
    [prefs]
  );

  const [expanded, setExpanded] = useState<boolean>(
    prefs?.ui.expandedTags ?? false
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  // Keep local expanded in sync with prefs when they load/change
  useEffect(() => {
    if (typeof prefs?.ui.expandedTags === "boolean") {
      setExpanded(prefs.ui.expandedTags);
    }
  }, [prefs?.ui.expandedTags]);

  // Ensure order list contains known tags only, and append unknowns at the end
  const ordered = useMemo(() => {
    const prefOrder = prefs?.tagOrder ?? [];
    const seen = new Set(prefOrder);
    const normalized = prefOrder.filter((t) => allTags.includes(t));
    const rest = allTags.filter((t) => !seen.has(t));
    return [...normalized, ...rest];
  }, [prefs?.tagOrder, allTags]);

  const favorites = useMemo(
    () => new Set(prefs?.favoriteTagIds ?? []),
    [prefs?.favoriteTagIds]
  );

  const leftFavorites = ordered.filter((t) => favorites.has(t));
  const others = ordered.filter((t) => !favorites.has(t));

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  const onDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      const list = [...ordered];
      const oldIndex = list.indexOf(String(active.id));
      const newIndex = list.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const moved = arrayMove(list, oldIndex, newIndex);
      void updatePrefs((draft) => {
        draft.tagOrder = moved;
      });
    },
    [ordered, updatePrefs]
  );

  const toggleFavorite = useCallback(
    (tag: string) => {
      const set = new Set(prefs?.favoriteTagIds ?? []);
      if (set.has(tag)) set.delete(tag);
      else set.add(tag);
      void updatePrefs((draft) => {
        draft.favoriteTagIds = Array.from(set);
      });
    },
    [prefs?.favoriteTagIds, updatePrefs]
  );

  const toggleExpanded = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    void updatePrefs((draft) => {
      draft.ui.expandedTags = next;
    });
  }, [expanded, updatePrefs]);

  const SortableItem = memo(({ tag }: { tag: string }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
      isSorting,
    } = useSortable({
      id: tag,
      animateLayoutChanges: () => false, // Disable dnd-kit's built-in layout animations
    });

    // Debug: Check if activeId matches this tag
    const isBeingDragged = activeId === tag;

    const style: CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition: isDragging ? "none" : transition, // No transition while actively dragging
      opacity: isBeingDragged ? 0 : 1, // Use global activeId to hide the dragged item
      pointerEvents: isDragging ? "none" : "auto", // Disable interactions while dragging
      visibility: isBeingDragged ? "hidden" : "visible", // Extra hiding for better UX
    };

    return (
      <motion.div
        layout={!isDragging && !isSorting} // Only allow Framer Motion layout when not involved in drag operations
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        ref={setNodeRef}
        style={style}
        className="relative"
      >
        <Badge
          variant={activeTag === tag ? "default" : "secondary"}
          className="flex items-center gap-1 select-none cursor-pointer"
          onClick={() => onChangeActive(activeTag === tag ? null : tag)}
          data-id={tag}
        >
          {/* Drag handle - separate from the badge content */}
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -m-1 rounded hover:bg-muted/50"
            aria-label="Drag to reorder"
          >
            ⋮⋮
          </span>

          {tag}

          <button
            type="button"
            aria-label={favorites.has(tag) ? "Unfavorite" : "Favorite"}
            className="ml-1 rounded-full hover:bg-muted p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(tag);
            }}
          >
            <Star
              className={
                favorites.has(tag) ? "w-3 h-3 fill-current" : "w-3 h-3"
              }
            />
          </button>
        </Badge>
      </motion.div>
    );
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Filter by Tags
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleExpanded}
          className="h-8 px-2"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" /> Collapse
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" /> Expand
            </>
          )}
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant={!activeTag ? "default" : "outline"}
            size="sm"
            onClick={() => onChangeActive(null)}
            className="h-8"
          >
            All
          </Button>

          <SortableContext
            items={ordered}
            strategy={horizontalListSortingStrategy}
          >
            <AnimatePresence initial={false}>
              {leftFavorites.map((tag) => (
                <SortableItem key={tag} tag={tag} />
              ))}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {(expanded ? others : others.slice(0, 8)).map((tag) => (
                <SortableItem key={tag} tag={tag} />
              ))}
            </AnimatePresence>
          </SortableContext>

          {!expanded && others.length > 8 ? (
            <span className="text-xs text-muted-foreground">
              +{others.length - 8} more
            </span>
          ) : null}
        </div>

        <DragOverlay>
          {activeId ? (
            <Badge
              variant={activeTag === activeId ? "default" : "secondary"}
              className="flex items-center gap-1 select-none opacity-90 shadow-lg cursor-grabbing"
            >
              <span className="p-1 -m-1">⋮⋮</span>
              {activeId}
              <Star
                className={
                  favorites.has(activeId) ? "w-3 h-3 fill-current" : "w-3 h-3"
                }
              />
            </Badge>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
