import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { COLORS, type ColorValue, type ColorOption, getColorName, getTextColorForBackground } from "@/lib/colors";
import { ChevronsUpDown } from "lucide-react";

export type ColorPickerProps = {
  value?: ColorValue;
  onChange: (color: ColorValue) => void;
  className?: string;
  allowCustom?: boolean;
};

export function ColorPicker({ value, onChange, className, allowCustom = true }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const current = value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-4 w-4 rounded-full border"
              style={{ backgroundColor: current ?? "#f3f4f6" }}
              aria-hidden
            />
            <span className="truncate">
              {current ? getColorName(current) : "Select color"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="grid grid-cols-5 gap-2">
          {COLORS.map((c: ColorOption) => (
            <button
              key={c.value}
              className={cn(
                "h-8 rounded-md border flex items-center justify-center transition-colors",
                current?.toLowerCase() === c.value.toLowerCase() && "ring-2 ring-offset-2 ring-primary"
              )}
              style={{ backgroundColor: c.value, color: getTextColorForBackground(c.value) }}
              onClick={() => {
                onChange(c.value);
                setOpen(false);
              }}
              aria-label={c.name}
              title={c.name}
            >
              <span className="text-xs font-medium">{c.name[0]}</span>
            </button>
          ))}
        </div>
        {allowCustom && (
          <div className="mt-3 flex items-center gap-2">
            <input
              aria-label="Pick custom color"
              type="color"
              value={current ?? "#808080"}
              onChange={(e) => onChange(e.target.value as ColorValue)}
              className="h-9 w-9 p-0 border rounded"
            />
            <span className="text-xs text-muted-foreground">Custom</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
