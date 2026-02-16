import type { NotionColor } from "../types";

const NOTION_COLORS: ReadonlySet<string> = new Set([
  "default",
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
  "gray_background",
  "brown_background",
  "orange_background",
  "yellow_background",
  "green_background",
  "blue_background",
  "purple_background",
  "pink_background",
  "red_background",
]);

/**
 * Returns true if the string is a valid Notion API color (block or inline).
 */
export function isValidNotionColor(color: string): color is NotionColor {
  return NOTION_COLORS.has(color);
}

/**
 * Normalize color for output: return as-is if valid, otherwise "default".
 */
export function normalizeNotionColor(color: string | undefined): NotionColor {
  if (color && isValidNotionColor(color)) return color;
  return "default";
}
