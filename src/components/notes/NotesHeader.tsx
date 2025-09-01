import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Filter, LayoutGrid, List } from "lucide-react";
import { useState, useRef, type ChangeEvent } from "react";
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

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleViewToggle = () => {
    const newViewState = !isSimpleView;
    setIsSimpleView(newViewState);
    onViewToggle(newViewState);
  };

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">My Notes</h1>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button size="sm" variant="outline" onClick={onAddNote}>
            <Plus className="mr-2 h-4 w-4" />
            Add Note
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt"
              className="hidden"
            />
            Import from TXT
          </Button>

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
            onChange={(e) => onSearch(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="filter" className="whitespace-nowrap">
              <Filter className="inline h-4 w-4 mr-1" />
              Filter by:
            </Label>
            <select
              id="filter"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              onChange={(e) => onFilterChange(e.target.value)}
              defaultValue=""
            >
              <option value="">All Notes</option>
              <option value="pinned">Pinned</option>
              <option value="recent">Recently Updated</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
