import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { Note } from "@/collections/notes";
import { Pencil, Pin, Trash2, Archive, Copy, ArrowRightLeft } from "lucide-react";

type NoteCardProps = {
  note: Note;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onArchive: (id: string) => void;
  onClone?: (id: string) => void;
  onMove?: (id: string) => void;
  simpleView?: boolean;
};

export function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onArchive,
  simpleView = false,
  onClone,
  onMove,
}: NoteCardProps) {
  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md group h-full flex flex-col min-h-[160px] will-change-transform transform-gpu">
      {note.color && (
        <div
          className="absolute top-0 left-0 w-1 h-full"
          style={{ backgroundColor: note.color }}
        />
      )}
      <CardHeader className="pb-3 min-h-[56px]">
        <div className="flex justify-between items-start gap-3">
          <CardTitle className="text-lg font-semibold line-clamp-2 flex-1">
            {note.title}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
            onClick={() => onTogglePin(note.id)}
          >
            <Pin
              className={`h-4 w-4 ${note.isPinned ? "fill-foreground" : ""}`}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-3 flex-1">
        <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
          {note.content}
        </p>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-3 pt-0 mt-auto min-h-[56px]">
        {note.tagIds && note.tagIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 w-full">
            {note.tagIds.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-2 py-1">
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
        <div className="flex justify-between w-full items-center">
          <span className="text-xs text-muted-foreground">
            {format(new Date(note.updatedAt), "MMM d, yyyy")}
          </span>
          <div className="flex gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
            {!simpleView && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-accent"
                onClick={() => onEdit(note.id)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {!simpleView && onClone && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-accent"
                onClick={() => onClone(note.id)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
            {!simpleView && onMove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-accent"
                onClick={() => onMove(note.id)}
              >
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-accent"
              onClick={() => onArchive(note.id)}
            >
              <Archive className="h-4 w-4" />
            </Button>
            {!simpleView && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(note.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
