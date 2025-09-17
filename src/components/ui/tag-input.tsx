import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import * as React from "react";

interface TagInputProps extends React.HTMLAttributes<HTMLDivElement> {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
  inputClassName?: string;
}

export function TagInput({
  tags = [],
  onTagsChange,
  placeholder = "Add a tag...",
  maxTags = 10,
  className,
  inputClassName,
  ...props
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      // Remove last tag on backspace when input is empty
      e.preventDefault();
      const newTags = [...tags];
      newTags.pop();
      onTagsChange(newTags);
    }
  };

  const addTag = () => {
    const trimmedValue = inputValue.trim();

    if (
      trimmedValue &&
      !tags.includes(trimmedValue) &&
      (maxTags === undefined || tags.length < maxTags)
    ) {
      onTagsChange([...tags, trimmedValue]);
      setInputValue("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 border rounded-md h-10 overflow-x-auto whitespace-nowrap",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className
      )}
      onClick={() => inputRef.current?.focus()}
      {...props}
    >
      {tags.map((tag) => (
        <div
          key={tag}
          className={cn(
            "flex-none inline-flex items-center px-2.5 h-6 rounded-full text-xs font-medium",
            "bg-primary/10 text-primary hover:bg-primary/20",
            "whitespace-nowrap overflow-hidden"
          )}
        >
          <span title={tag} className="truncate max-w-[10rem] block px-1">
            {tag}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag);
            }}
            className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-primary/30"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {(!maxTags || tags.length < maxTags) && (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : ""}
          className={cn(
            "flex-none min-w-[140px] bg-transparent outline-none text-sm self-center",
            "placeholder:text-muted-foreground",
            inputClassName
          )}
        />
      )}

      {maxTags && (
        <div className="text-xs text-muted-foreground self-center ml-auto">
          {tags.length}/{maxTags} tags
        </div>
      )}
    </div>
  );
}
