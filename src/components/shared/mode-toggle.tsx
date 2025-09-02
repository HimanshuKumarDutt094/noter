import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";

type Ripple = {
  id: number;
  x: number;
  y: number;
  size: number;
};

export function ModeToggle() {
  const { setTheme, theme } = useTheme();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const idRef = useRef(0);
  const rootRect = useMemo(() => {
    const el = document.documentElement;
    return { w: el.clientWidth, h: el.clientHeight };
  }, []);

  const spawnRipple = useCallback((x: number, y: number) => {
    // compute radius to farthest corner
    const distances = [
      Math.hypot(x, y),
      Math.hypot(rootRect.w - x, y),
      Math.hypot(x, rootRect.h - y),
      Math.hypot(rootRect.w - x, rootRect.h - y),
    ];
    const radius = Math.max(...distances);
    const size = radius * 2;
    const id = ++idRef.current;
    setRipples((r) => [...r, { id, x, y, size }]);
    // auto-remove ripple after animation
    setTimeout(() => {
      setRipples((r) => r.filter((rp) => rp.id !== id));
    }, 900);
  }, [rootRect.h, rootRect.w]);

  const handleChoose = useCallback(
    (next: "light" | "dark" | "system") => (e: React.MouseEvent) => {
      const { clientX, clientY } = e;
      spawnRipple(clientX, clientY);
      // delay theme change to sync with wave start
      setTimeout(() => {
        setTheme(next);
      }, 200);
    },
    [setTheme, spawnRipple]
  );

  const handleToggle = useCallback((e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    spawnRipple(clientX, clientY);
    const next = theme === "dark" ? "light" : "dark";
    setTimeout(() => setTheme(next), 200);
  }, [spawnRipple, setTheme, theme]);

  return (
    <>
      {createPortal(
        <div className="pointer-events-none fixed inset-0 z-50">
          {ripples.map((r) => (
            <motion.div
              key={r.id}
              initial={{ scale: 0, opacity: 0.35 }}
              animate={{ scale: 1, opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="fixed rounded-full"
              style={{
                left: r.x - r.size / 2,
                top: r.y - r.size / 2,
                width: r.size,
                height: r.size,
                background:
                  "radial-gradient(closest-side, color-mix(in oklab, var(--primary) 65%, transparent), transparent 70%)",
                mixBlendMode: "overlay",
                pointerEvents: "none",
                zIndex: 60,
              }}
            />
          ))}
        </div>,
        document.body
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" onClick={handleToggle}>
            <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleChoose("light")}>Light</DropdownMenuItem>
          <DropdownMenuItem onClick={handleChoose("dark")}>Dark</DropdownMenuItem>
          <DropdownMenuItem onClick={handleChoose("system")}>System</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
