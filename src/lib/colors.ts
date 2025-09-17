// Color utilities for the application (strict and DRY)
import { z } from "zod";

export type ColorOption = {
  name: ColorName;
  value: ColorValue;
  textColor: ColorValue;
};

export type ColorName =
  | "Red"
  | "Orange"
  | "Yellow"
  | "Green"
  | "Blue"
  | "Indigo"
  | "Purple"
  | "Pink"
  | "Cyan"
  | "Teal"
  | "Gray"
  | "Black";

export type ColorValue = `#${string}`;

// Shared hex color validator (centralized)
export const HexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/i, "Invalid hex color");

export const COLORS: readonly ColorOption[] = [
  { name: "Red", value: "#ef4444", textColor: "#ffffff" },
  { name: "Orange", value: "#fb923c", textColor: "#ffffff" },
  { name: "Yellow", value: "#f59e0b", textColor: "#000000" },
  { name: "Green", value: "#22c55e", textColor: "#000000" },
  { name: "Blue", value: "#3b82f6", textColor: "#ffffff" },
  { name: "Indigo", value: "#6366f1", textColor: "#ffffff" },
  { name: "Purple", value: "#8b5cf6", textColor: "#ffffff" },
  { name: "Pink", value: "#ec4899", textColor: "#ffffff" },
  { name: "Cyan", value: "#06b6d4", textColor: "#ffffff" },
  { name: "Teal", value: "#14b8a6", textColor: "#ffffff" },
  { name: "Gray", value: "#6b7280", textColor: "#ffffff" },
  { name: "Black", value: "#111827", textColor: "#ffffff" },
];

export const getTextColorForBackground = (
  bgColor: ColorValue | undefined
): ColorValue => {
  // Default to dark text if no color is provided
  if (!bgColor) return "#1f2937";

  const color = COLORS.find(
    (c) => c.value.toLowerCase() === bgColor.toLowerCase()
  );
  if (color) return color.textColor as ColorValue;

  // For custom hex colors not in palette, compute contrast-aware text color
  return getContrastAwareTextColor(bgColor);
};

export const getColorName = (colorValue: ColorValue): string => {
  const color = COLORS.find(
    (c) => c.value.toLowerCase() === colorValue.toLowerCase()
  );
  return color ? color.name : "Custom";
};

export const isPaletteColor = (colorValue: string): colorValue is ColorValue =>
  COLORS.some((c) => c.value.toLowerCase() === colorValue.toLowerCase());

// --- Contrast-aware utilities ---

function hexToRgb(hex: ColorValue): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : normalized;
  const num = parseInt(value, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return { r, g, b };
}

function relativeLuminance({
  r,
  g,
  b,
}: {
  r: number;
  g: number;
  b: number;
}): number {
  const srgb = [r, g, b].map((c) => c / 255);
  const linear = srgb.map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  const [R, G, B] = linear;
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function getContrastAwareTextColor(bgColor: ColorValue): ColorValue {
  const { r, g, b } = hexToRgb(bgColor);
  const L = relativeLuminance({ r, g, b });
  // Compare contrast ratios with white and black; pick higher contrast
  const whiteContrast = 1.05 / (L + 0.05);
  const blackContrast = (L + 0.05) / 0.05;
  return (whiteContrast >= blackContrast ? "#ffffff" : "#000000") as ColorValue;
}
