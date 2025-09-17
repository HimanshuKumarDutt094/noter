import { cn } from "@/lib/utils";
import { Popover as Popover } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import * as React from "react";

type Option = { value: string; label: React.ReactNode; left?: React.ReactNode };

export type MultiSelectProps = {
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
};

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const toggle = (v: string) => {
    const next = value.includes(v)
      ? value.filter((x) => x !== v)
      : [...value, v];
    onChange(next);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-2 text-sm w-full justify-between min-w-0",
            className
          )}
        >
          <span className="truncate">
            {value.length === 0 ? placeholder : `${value.length} selected`}
          </span>
          <ChevronDown className="size-4 opacity-60" />
        </button>
      </Popover.Trigger>
      <Popover.Content
        align="start"
        sideOffset={8}
        className="z-50 min-w-[200px] max-w-[20rem] w-auto p-2 bg-popover border rounded-md shadow-md"
      >
        <div className="flex flex-col gap-1">
          {options.map((o) => {
            const checked = value.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className={cn(
                  "flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/50 focus:outline-none min-w-0",
                  checked && "bg-accent/30"
                )}
              >
                <span className="inline-flex items-center justify-center w-4 h-4 rounded border bg-background">
                  {checked ? <Check className="size-4" /> : null}
                </span>
                {o.left && <span className="mr-2">{o.left}</span>}
                <span className="truncate max-w-full">{o.label}</span>
              </button>
            );
          })}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
