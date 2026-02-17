import type { NotionBlock, NotionRichText, NotionColor } from "../types";
import { richTextToInlineMarkdown } from "./rich-text";
import { normalizeNotionColor } from "../utils/colors";

export function getBlockRichText(block: NotionBlock): NotionRichText[] {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return [];
  const p = payload as { rich_text?: NotionRichText[]; text?: NotionRichText[] };
  const rt = p.rich_text ?? p.text;
  return Array.isArray(rt) ? rt : [];
}

export function getBlockColor(block: NotionBlock): NotionColor | undefined {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return undefined;
  const color = (payload as { color?: string }).color;
  return color as NotionColor | undefined;
}

export function blockRichTextToMd(block: NotionBlock, opts?: { suppressBold?: boolean }): string {
  return richTextToInlineMarkdown(getBlockRichText(block), opts);
}

export function colorSuffix(block: NotionBlock): string {
  const color = getBlockColor(block);
  const c = normalizeNotionColor(color);
  if (c === "default") return "";
  return ` {color="${c}"}`;
}

export function getBlockChildren(block: NotionBlock): NotionBlock[] {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return [];
  const children = (payload as { children?: NotionBlock[] }).children;
  return Array.isArray(children) ? children : [];
}
