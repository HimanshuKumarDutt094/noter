import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { useMemo, useState } from "react";

interface TagSelectorProps {
  selectedTags: readonly string[];
  onTagsChange: (tags: readonly string[]) => void;
  availableTags?: readonly string[];
  placeholder?: string;
  onCreateTag?: (name: string) => void;
}

const EMPTY: string[] = [];

export function TagSelector({
  selectedTags,
  onTagsChange,
  availableTags,
  placeholder = "Add a tag...",
  onCreateTag,
}: TagSelectorProps) {
  const [inputValue, setInputValue] = useState("");
  // Stabilize arrays to avoid new [] identity each render
  const safeAvailableTags = useMemo(
    () => availableTags ?? EMPTY,
    [availableTags]
  );
  const safeSelectedTags = useMemo(() => selectedTags ?? EMPTY, [selectedTags]);

  const suggestions = useMemo(() => {
    const query = inputValue.trim();
    if (!query) return EMPTY;
    const q = query.toLowerCase();
    return safeAvailableTags.filter(
      (tag) => tag.toLowerCase().includes(q) && !safeSelectedTags.includes(tag)
    );
  }, [inputValue, safeAvailableTags, safeSelectedTags]);

  const handleAddTag = (tag: string) => {
    if (tag && !safeSelectedTags.includes(tag)) {
      onTagsChange([...safeSelectedTags, tag]);
      if (!safeAvailableTags.includes(tag)) {
        onCreateTag?.(tag);
      }
    }
    setInputValue("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(safeSelectedTags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (["Enter", "Tab", ","].includes(e.key)) {
      e.preventDefault();
      const tag = inputValue.trim();
      if (tag) {
        handleAddTag(tag);
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="max-h-24 overflow-auto">
        {" "}
        {/* fixed-height tag list with scroll */}
        <div className="flex flex-wrap gap-2">
          {safeSelectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 p-0.5"
                aria-label={`Remove ${tag} tag`}
              >
                <X size={14} />
              </button>
            </Badge>
          ))}
        </div>
      </div>
      <div className="relative">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full"
        />
        {suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion}
                className="cursor-pointer px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                onMouseDown={() => handleAddTag(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
