import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  availableTags?: string[];
  placeholder?: string;
}

const EMPTY: string[] = [];

export function TagSelector({
  selectedTags,
  onTagsChange,
  availableTags,
  placeholder = 'Add a tag...',
}: TagSelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Stabilize arrays to avoid new [] identity each render
  const safeAvailableTags = availableTags ?? EMPTY;
  const safeSelectedTags = selectedTags ?? EMPTY;

  useEffect(() => {
    const query = inputValue.trim();
    if (query) {
      const filtered = safeAvailableTags
        .filter(tag =>
          tag.toLowerCase().includes(query.toLowerCase()) &&
          !safeSelectedTags.includes(tag)
        );
      // Only set when changed (length or content)
      const sameLength = filtered.length === suggestions.length;
      const sameContent = sameLength && filtered.every((t, i) => t === suggestions[i]);
      if (!sameContent) setSuggestions(filtered);
    } else {
      if (suggestions.length !== 0) setSuggestions([]);
    }
  }, [inputValue, safeAvailableTags, safeSelectedTags, suggestions]);

  const handleAddTag = (tag: string) => {
    if (tag && !safeSelectedTags.includes(tag)) {
      onTagsChange([...safeSelectedTags, tag]);
    }
    setInputValue('');
    setSuggestions([]);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(safeSelectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (['Enter', 'Tab', ','].includes(e.key)) {
      e.preventDefault();
      const tag = inputValue.trim();
      if (tag) {
        handleAddTag(tag);
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {safeSelectedTags.map(tag => (
          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
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
      <div className="relative">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setSuggestions([])}
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
