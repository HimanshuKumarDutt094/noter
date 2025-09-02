import { useEffect, useMemo, useState, useCallback, memo, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Star } from "lucide-react";
import { usePreferences } from "@/hooks/usePreferences";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "motion/react";

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
  const { prefs, updatePrefs } = usePreferences();
  const [expanded, setExpanded] = useState<boolean>(
    prefs?.ui.expandedTags ?? false
  );

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
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const onDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const list = [...ordered];
    const oldIndex = list.indexOf(String(active.id));
    const newIndex = list.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const moved = arrayMove(list, oldIndex, newIndex);
    void updatePrefs((draft) => {
      draft.tagOrder = moved;
    });
  }, [ordered, updatePrefs]);

  const toggleFavorite = useCallback((tag: string) => {
    const set = new Set(prefs?.favoriteTagIds ?? []);
    if (set.has(tag)) set.delete(tag);
    else set.add(tag);
    void updatePrefs((draft) => {
      draft.favoriteTagIds = Array.from(set);
    });
  }, [prefs?.favoriteTagIds, updatePrefs]);

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
    } = useSortable({ id: tag });
    const style: CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      cursor: isDragging ? "grabbing" : "grab",
      opacity: isDragging ? 0.8 : 1,
    };
    return (
      <motion.div
        layout
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
      >
        <Badge
          variant={activeTag === tag ? "default" : "secondary"}
          className="flex items-center gap-1 select-none"
          onClick={() => onChangeActive(activeTag === tag ? null : tag)}
          data-id={tag}
        >
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

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant={!activeTag ? "default" : "outline"}
            size="sm"
            onClick={() => onChangeActive(null)}
            className="h-8"
          >
            All
          </Button>

          <SortableContext items={ordered}>
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
      </DndContext>
    </div>
  );
}
