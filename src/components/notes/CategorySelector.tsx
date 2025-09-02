import { useLiveQuery } from '@tanstack/react-db';
import { categoriesCollection, baseCategoriesCollection } from '@/lib/db';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { Category } from '@/collections/categories';
import { createCategoryWithTimestamps } from '@/collections/categories';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '@/components/shared/ColorPicker';
import type { ColorValue } from '@/lib/colors';
import { toast } from 'sonner';

type CategorySelectorProps = {
  selectedCategoryId?: string;
  onSelectCategory: (categoryId: string | undefined) => void;
  className?: string;
};

export function CategorySelector({ selectedCategoryId, onSelectCategory, className }: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<ColorValue>("#808080" as ColorValue);
  
  const { data: categories = [] } = useLiveQuery(categoriesCollection) as {
    data: Category[];
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const handleSelect = useCallback((id: string | undefined) => {
    onSelectCategory(id);
    setOpen(false);
  }, [onSelectCategory]);

  const handleStartCreate = useCallback(() => setCreating(true), []);
  const handleCancelCreate = useCallback(() => setCreating(false), []);
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value), []);
  const handleColorChange = useCallback((c: ColorValue) => setNewColor(c), []);
  const handleOpenChange = useCallback((v: boolean) => setOpen(v), []);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    const dup = categories.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (dup) {
      toast.error('Category already exists');
      return;
    }
    const created = createCategoryWithTimestamps({ name, color: newColor });
    await baseCategoriesCollection.insert(created);
    onSelectCategory(created.id);
    setNewName("");
    setCreating(false);
    setOpen(false);
  }, [categories, newColor, newName, onSelectCategory]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedCategory ? (
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: selectedCategory.color }}
              />
              {selectedCategory.name}
            </div>
          ) : (
            "Select category..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <div className="max-h-60 overflow-y-auto">
          {categories.length > 0 && categories.map((category) => (
            <button
              key={category.id}
              className={cn(
                "w-full flex items-center gap-2 p-2 text-sm hover:bg-accent hover:text-accent-foreground",
                selectedCategoryId === category.id && "bg-accent/50"
              )}
              onClick={() => handleSelect(category.id)}
            >
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: category.color }}
              />
              <span className="truncate">{category.name}</span>
              {selectedCategoryId === category.id && (
                <Check className="ml-auto h-4 w-4 text-primary" />
              )}
            </button>
          ))}
          {(categories.length === 0 || creating) ? (
            <div className="p-3 space-y-2 border-t">
              <div className="text-sm font-medium">Create category</div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Category name"
                  value={newName}
                  onChange={handleNameChange}
                />
                <ColorPicker value={newColor} onChange={handleColorChange} />
              </div>
              <div className="flex justify-end gap-2">
                {categories.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleCancelCreate}>Cancel</Button>
                )}
                <Button size="sm" onClick={handleCreate}>
                  Create
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start rounded-none border-t"
              onClick={handleStartCreate}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create new category
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
