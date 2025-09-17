import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, LayoutGrid, List, Plus } from "lucide-react";
import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

type NotesHeaderProps = {
  onImportNotes: (notes: string[]) => void;
  onAddNote: () => void;
  onSearch: (query: string) => void;
  onViewToggle: (isSimpleView: boolean) => void;
  onFilterChange: (filter: string) => void;
};

export function NotesHeader({
  onImportNotes,
  onAddNote,
  onSearch,
  onViewToggle,
  onFilterChange,
}: NotesHeaderProps) {
  const [isSimpleView, setIsSimpleView] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        // Split by empty lines to separate notes
        const notes = text.split(/\n\s*\n/).filter((note) => note.trim());
        onImportNotes(notes);
        toast.success(`Imported ${notes.length} notes`);
      } catch (error) {
        console.error("Error reading file:", error);
        toast.error("Failed to import notes");
      } finally {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [onImportNotes]
  );

  const handleViewToggle = useCallback(() => {
    const newViewState = !isSimpleView;
    setIsSimpleView(newViewState);
    onViewToggle(newViewState);
  }, [isSimpleView, onViewToggle]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onSearch(e.target.value),
    [onSearch]
  );

  const handleFilterChange = useCallback(
    (value: string) => onFilterChange(value),
    [onFilterChange]
  );

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">My Notes</h1>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={onAddNote}>
                Create Note
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                Import from TXT
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".txt"
            className="hidden"
          />

          <Button
            size="sm"
            variant="outline"
            onClick={handleViewToggle}
            title={
              isSimpleView ? "Switch to detailed view" : "Switch to simple view"
            }
          >
            {isSimpleView ? (
              <LayoutGrid className="h-4 w-4" />
            ) : (
              <List className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search notes..."
            onChange={handleSearchChange}
            className="w-full"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="filter" className="whitespace-nowrap">
              <Filter className="inline h-4 w-4 mr-1" />
              Filter by:
            </Label>
            <Select onValueChange={handleFilterChange} defaultValue="">
              <SelectTrigger id="filter" className="w-[200px] h-10">
                <SelectValue placeholder="All Notes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Notes</SelectItem>
                <SelectItem value="pinned">Pinned</SelectItem>
                <SelectItem value="recent">Recently Updated</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
