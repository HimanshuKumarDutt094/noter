import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import type { Note } from "@/collections/notes";
import { NoteCard } from "./NoteCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Grid2X2, List, Plus, Download, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportNotes, importNotes } from "@/lib/import-export";
import { TagFilterBar } from "@/components/notes/TagFilterBar";
import { toast } from "sonner";
import { filterNotes } from "@/lib/filters";
import { sortNotes } from "@/lib/sorting";
import {
  useQueryState,
  parseAsString,
  parseAsBoolean,
  parseAsInteger,
  parseAsStringEnum,
} from "nuqs";

type ViewMode = "grid" | "list";
type SortBy = "newest" | "oldest" | "title";

type NoteListProps = {
  notes: Note[];
  onAddNote: () => void;
  onEditNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onArchiveNote: (id: string) => void;
  onCloneNote?: (id: string) => void;
  onMoveNote?: (id: string) => void;
  onImportNotes: (notes: Array<Omit<Note, "id" | "createdAt" | "updatedAt">>) => void;
};

export function NoteList({
  notes,
  onAddNote,
  onEditNote,
  onDeleteNote,
  onTogglePin,
  onArchiveNote,
  onCloneNote,
  onMoveNote,
  onImportNotes,
}: NoteListProps) {
  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault("")
  );
  const [viewMode, setViewMode] = useQueryState(
    "view",
    parseAsStringEnum(["grid", "list"]).withDefault("grid")
  );
  const [sortBy, setSortBy] = useQueryState(
    "sort",
    parseAsStringEnum(["newest", "oldest", "title"]).withDefault("newest")
  );
  const [activeTag, setActiveTag] = useQueryState("tag");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [simpleView, setSimpleView] = useQueryState(
    "simple",
    parseAsBoolean.withDefault(false)
  );
  const [customCols, setCustomCols] = useQueryState(
    "cols",
    parseAsInteger.withDefault(4)
  );
  const [useCustomCols, setUseCustomCols] = useState(false);

  // Initialize custom-cols toggle from query param presence/value
  useEffect(() => {
    setUseCustomCols(customCols !== 4);
  }, [customCols]);

  const handleExport = useCallback(() => {
    try {
      exportNotes(notes);
      toast.success("Notes exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export notes");
    }
  }, [notes]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedNotes = await importNotes(file);
      onImportNotes(importedNotes);
      toast.success(`Successfully imported ${importedNotes.length} notes`);
    } catch (error) {
      console.error("Import failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to import notes"
      );
    } finally {
      // Reset the input value to allow re-importing the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [onImportNotes]);

  // Get all unique tags from notes
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach((note) => {
      note.tagIds?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  }, [notes]);

  // Filter and sort notes (shared filters utility)
  const filteredNotes = useMemo(() => {
    const result = filterNotes(notes, {
      text: searchQuery,
      tagIds: activeTag ? [activeTag] : [],
      // categoryIds and projectIds can be wired from parent/scoped contexts later
    });
    return sortNotes(result, sortBy);
  }, [notes, searchQuery, sortBy, activeTag]);

  const pinnedNotes = filteredNotes.filter((note) => note.isPinned);
  const otherNotes = filteredNotes.filter((note) => !note.isPinned);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <h1 className="text-2xl font-bold">Notes</h1>
          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Simple view</span>
              <Switch checked={simpleView} onCheckedChange={setSimpleView} />
            </div>
            <Button size="sm" variant="outline" onClick={onAddNote} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Note</span>
            </Button>
            <Tabs
              value={viewMode}
              onValueChange={(value) => setViewMode(value as ViewMode)}
              className="hidden sm:block"
            >
              <TabsList className="grid grid-cols-2 h-9">
                <TabsTrigger value="grid" className="h-8 w-9 p-0">
                  <Grid2X2 className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="list" className="h-8 w-9 p-0">
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Search and Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search notes..."
              className="pl-10 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={sortBy}
            onValueChange={(value: SortBy) => setSortBy(value)}
          >
            <SelectTrigger className="w-full sm:w-[180px] h-10">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="title">Title (A-Z)</SelectItem>
            </SelectContent>
          </Select>
          {viewMode === "grid" && (
            <div className="flex items-center gap-2">
              <Switch
                checked={useCustomCols}
                onCheckedChange={(checked) => {
                  setUseCustomCols(checked);
                  if (!checked) {
                    // Reset to default columns in URL when turning off custom cols
                    setCustomCols(4);
                  }
                }}
              />
              <span className="text-sm text-muted-foreground">Custom columns</span>
              {useCustomCols && (
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={customCols}
                  onChange={(e) =>
                    setCustomCols(
                      Math.max(1, Math.min(8, Number(e.target.value) || 1))
                    )
                  }
                  className="w-20 h-10"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tags filter (DnD + favorites via TagFilterBar) */}
      {allTags.length > 0 && (
        <TagFilterBar
          allTags={allTags}
          activeTag={activeTag}
          onChangeActive={setActiveTag}
        />
      )}

      {/* Pinned notes section */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">PINNED</h2>
          <div
            className={cn(
              "gap-4 transition-all duration-200",
              viewMode === "grid"
                ? useCustomCols
                  ? "grid"
                  : "grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4"
                : "space-y-3"
            )}
            style={
              viewMode === "grid" && useCustomCols
                ? { gridTemplateColumns: `repeat(${customCols}, minmax(0, 1fr))` }
                : undefined
            }
          >
            {pinnedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={onEditNote}
                onDelete={onDeleteNote}
                onTogglePin={onTogglePin}
                onArchive={onArchiveNote}
                onClone={onCloneNote}
                onMove={onMoveNote}
                simpleView={simpleView}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other notes section */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          {activeTag ? `${activeTag.toUpperCase()} NOTES` : "ALL NOTES"}
        </h2>
        {otherNotes.length > 0 ? (
          <div
            className={cn(
              "gap-4",
              viewMode === "grid"
                ? useCustomCols
                  ? "grid"
                  : "grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4"
                : "space-y-3"
            )}
            style={
              viewMode === "grid" && useCustomCols
                ? { gridTemplateColumns: `repeat(${customCols}, minmax(0, 1fr))` }
                : undefined
            }
          >
            {otherNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={onEditNote}
                onDelete={onDeleteNote}
                onTogglePin={onTogglePin}
                onArchive={onArchiveNote}
                onClone={onCloneNote}
                onMove={onMoveNote}
                simpleView={simpleView}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <List className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">No notes found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || activeTag
                ? "Try adjusting your search or filter criteria"
                : "Get started by creating a new note"}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button size="sm" variant="outline" onClick={handleImportClick} className="w-full sm:w-auto">
                <Upload className="h-4 w-4 mr-2" />
                Import Notes
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json,.txt,text/plain"
                className="hidden"
              />
              <Button size="sm" variant="outline" onClick={handleExport} className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Export Notes
              </Button>
              <Button size="sm" onClick={onAddNote} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Create Note
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
