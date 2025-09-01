// Color utilities for the application (strict and DRY)

export type ColorOption = {
  name: ColorName;
  value: ColorValue;
  textColor: ColorValue;
};

export type ColorName =
  | 'Red'
  | 'Orange'
  | 'Yellow'
  | 'Green'
  | 'Blue'
  | 'Indigo'
  | 'Purple'
  | 'Pink'
  | 'Gray'
  | 'Black';

export type ColorValue = `#${string}`;

export const COLORS: readonly ColorOption[] = [
  { name: 'Red', value: '#fef2f2', textColor: '#b91c1c' },
  { name: 'Orange', value: '#ffedd5', textColor: '#c2410c' },
  { name: 'Yellow', value: '#fef9c3', textColor: '#a16207' },
  { name: 'Green', value: '#ecfccb', textColor: '#3f6212' },
  { name: 'Blue', value: '#e0f2fe', textColor: '#0369a1' },
  { name: 'Indigo', value: '#e0e7ff', textColor: '#3730a3' },
  { name: 'Purple', value: '#f3e8ff', textColor: '#6b21a8' },
  { name: 'Pink', value: '#fce7f3', textColor: '#9d174d' },
  { name: 'Gray', value: '#f3f4f6', textColor: '#4b5563' },
  { name: 'Black', value: '#1f2937', textColor: '#f9fafb' },
];

export const getTextColorForBackground = (bgColor: ColorValue | undefined): ColorValue => {
  // Default to dark text if no color is provided
  if (!bgColor) return '#1f2937';

  const color = COLORS.find((c) => c.value.toLowerCase() === bgColor.toLowerCase());
  return (color ? color.textColor : '#1f2937') as ColorValue;
};

export const getColorName = (colorValue: ColorValue): string => {
  const color = COLORS.find((c) => c.value.toLowerCase() === colorValue.toLowerCase());
  return color ? color.name : 'Custom';
};

export const isPaletteColor = (colorValue: string): colorValue is ColorValue =>
  COLORS.some((c) => c.value.toLowerCase() === colorValue.toLowerCase());
