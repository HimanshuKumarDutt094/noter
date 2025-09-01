import { useState, useRef } from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Tag } from "@/collections/categories";

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  availableTags?: Tag[];
  className?: string;
};

export function TagInput({
  value = [],
  onChange,
  availableTags = [],
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddTag = (tagId: string) => {
    if (!value.includes(tagId)) {
      onChange([...value, tagId]);
    }
    setInputValue("");
  };

  const handleRemoveTag = (tagId: string) => {
    onChange(value.filter((id) => id !== tagId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (["Enter", "Tab", ","].includes(e.key)) {
      e.preventDefault();
      const val = inputValue.trim();

      if (val && !value.includes(val)) {
        // Check if this matches an existing tag
        const existingTag = availableTags.find(
          (tag) => tag.name.toLowerCase() === val.toLowerCase()
        );

        if (existingTag) {
          handleAddTag(existingTag.id);
        } else {
          // TODO: Show dialog to create new tag
          console.log("Create new tag:", val);
        }
      }
    }
  };

  const filteredTags = availableTags.filter(
    (tag) =>
      !value.includes(tag.id) &&
      tag.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {value.map((tagId) => {
          const tag = availableTags.find((t) => t.id === tagId);
          if (!tag) return null;

          return (
            <Badge
              key={tagId}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1 text-sm font-medium"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTag(tagId);
                }}
                className="ml-1 rounded-full hover:bg-black/10 dark:hover:bg-white/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
        <div className="relative flex-1 min-w-[100px]">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
            placeholder="Add tags..."
            className="h-8 border-0 shadow-none focus-visible:ring-0"
          />

          {isInputFocused && inputValue && filteredTags.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md bg-popover shadow-lg border">
              <div className="p-1">
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm flex items-center gap-2"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleAddTag(tag.id);
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </button>
                ))}
                <button
                  type="button"
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm flex items-center gap-2 text-muted-foreground"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    // TODO: Show create tag dialog
                    console.log("Create tag:", inputValue);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create "{inputValue}"
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
