import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  type ColorOption,
  COLORS,
  type ColorValue,
  getColorName,
  getTextColorForBackground,
} from "@/lib/colors";
import { cn } from "@/lib/utils";
import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";

export type ColorPickerProps = {
  value?: ColorValue;
  onChange: (color: ColorValue) => void;
  className?: string;
  allowCustom?: boolean;
};

export function ColorPicker({
  value,
  onChange,
  className,
  allowCustom = true,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const current = value;
  const [customHex, setCustomHex] = useState<string>(current ?? "#808080");

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
      <PopoverContent className="w-72 p-3">
        <div className="grid grid-cols-4 gap-3">
          {COLORS.map((c: ColorOption) => (
            <button
              key={c.value}
              className={cn(
                "h-10 w-10 rounded-md border flex items-center justify-center transition-transform focus:outline-none",
                current?.toLowerCase() === c.value.toLowerCase() &&
                  "ring-2 ring-offset-2 ring-primary scale-110"
              )}
              style={{
                backgroundColor: c.value,
                color: getTextColorForBackground(c.value),
              }}
              onClick={() => {
                onChange(c.value);
                setCustomHex(c.value);
                setOpen(false);
              }}
              aria-label={c.name}
              title={c.name}
            >
              <span className="sr-only">{c.name}</span>
            </button>
          ))}
        </div>
        {allowCustom && (
          <div className="mt-3 flex items-center gap-2">
            <input
              aria-label="Pick custom color"
              type="color"
              value={customHex}
              onChange={(e) => {
                setCustomHex(e.target.value);
                onChange(e.target.value as ColorValue);
              }}
              className="h-9 w-9 p-0 border rounded"
            />
            <input
              aria-label="Custom hex"
              value={customHex}
              onChange={(e) => setCustomHex(e.target.value)}
              onBlur={() => {
                // Validate simple hex and apply
                const v = customHex.trim();
                if (/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(v)) {
                  onChange(v as ColorValue);
                }
              }}
              className="h-9 rounded px-2 border text-sm w-full"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
