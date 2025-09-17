import type { Note } from "@/collections/notes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import {
  Archive,
  ArrowRightLeft,
  Copy,
  Pencil,
  Pin,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { memo, useCallback } from "react";

type NoteCardProps = {
  note: Note;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onArchive: (id: string) => void;
  onClone?: (id: string) => void;
  onMove?: (id: string) => void;
  simpleView?: boolean;
  isRow?: boolean;
};

export const NoteCard = memo(function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onArchive,
  simpleView = false,
  onClone,
  onMove,
  isRow = false,
}: NoteCardProps) {
  const handleTogglePin = useCallback(
    () => onTogglePin(note.id),
    [onTogglePin, note.id]
  );
  const handleEdit = useCallback(() => onEdit(note.id), [onEdit, note.id]);
  const handleClone = useCallback(() => onClone?.(note.id), [onClone, note.id]);
  const handleMove = useCallback(() => onMove?.(note.id), [onMove, note.id]);
  const handleArchive = useCallback(
    () => onArchive(note.id),
    [onArchive, note.id]
  );
  const handleDelete = useCallback(
    () => onDelete(note.id),
    [onDelete, note.id]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className={isRow ? "" : "h-full"}
    >
      <Card
        className={
          `relative overflow-hidden transition-all duration-200 hover:shadow-lg group will-change-transform transform-gpu ` +
          (isRow
            ? "flex items-start gap-3 p-2 min-h-0"
            : "h-full flex flex-col min-h-[160px]")
        }
      >
        {/* soft gradient glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background:
              "radial-gradient(120px 80px at 80% 0%, color-mix(in oklab, var(--accent) 16%, transparent), transparent 70%)",
          }}
        />

        {note.color && (
          <div
            className="absolute top-0 left-0 w-1 h-full"
            style={{ backgroundColor: note.color }}
          />
        )}

        {/* In row mode we wrap header+content in a flexible column so both can take full width */}
        <div className={isRow ? "flex-1 min-w-0" : ""}>
          <CardHeader className={isRow ? "pb-1 min-h-0" : "pb-3 min-h-[56px]"}>
            <div
              className={
                isRow
                  ? "flex items-start gap-2 w-full"
                  : "flex justify-between items-start gap-3"
              }
            >
              <CardTitle
                className={
                  isRow
                    ? "text-sm font-semibold truncate text-left w-full"
                    : "text-lg font-semibold line-clamp-1 flex-1 text-left"
                }
              >
                {note.title}
              </CardTitle>
              {!isRow && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
                  onClick={handleTogglePin}
                >
                  <Pin
                    className={`h-4 w-4 ${
                      note.isPinned ? "fill-foreground" : ""
                    }`}
                  />
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className={isRow ? "p-0 pl-1 pr-1" : "pb-3 flex-1"}>
            <p
              className={
                isRow
                  ? "text-sm text-muted-foreground line-clamp-2 leading-tight w-full truncate"
                  : "text-sm text-muted-foreground line-clamp-3 leading-relaxed"
              }
            >
              {note.content}
            </p>
          </CardContent>
        </div>

        <CardFooter
          className={
            isRow
              ? "flex items-center gap-2 pt-0 min-h-0"
              : "flex flex-col items-start gap-3 pt-0 mt-auto min-h-[56px]"
          }
        >
          {note.tagIds && note.tagIds.length > 0 && (
            <div
              className={
                isRow
                  ? "flex flex-wrap gap-1 w-auto"
                  : "flex flex-wrap gap-1.5 w-full"
              }
            >
              {note.tagIds.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs px-2 py-1"
                >
                  {tag}
                </Badge>
              ))}
              {note.tagIds.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-1">
                  +{note.tagIds.length - 3}
                </Badge>
              )}
            </div>
          )}
          <div
            className={
              isRow
                ? "flex items-center gap-3 w-auto ml-auto"
                : "flex justify-between w-full items-center"
            }
          >
            <span className="text-xs text-muted-foreground">
              {format(new Date(note.updatedAt), "MMM d, yyyy")}
            </span>
            <div className="flex gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
              {/* Pin should be accessible in row mode via footer actions */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-accent"
                    onClick={handleTogglePin}
                  >
                    <Pin
                      className={`h-4 w-4 ${
                        note.isPinned ? "fill-foreground" : ""
                      }`}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Pin note</TooltipContent>
              </Tooltip>
              {!simpleView && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-accent"
                      onClick={handleEdit}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit note</TooltipContent>
                </Tooltip>
              )}
              {!simpleView && onClone && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-accent"
                      onClick={handleClone}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clone note</TooltipContent>
                </Tooltip>
              )}
              {!simpleView && onMove && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-accent"
                      onClick={handleMove}
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Move note</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-accent"
                    onClick={handleArchive}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Archive note</TooltipContent>
              </Tooltip>
              {!simpleView && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete note</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
});
