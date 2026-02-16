import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";

function getChildPageTitle(block: NotionBlock): string {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  return (payload as { title?: string }).title ?? "";
}

export function visitChildPage(block: NotionBlock, _ctx: SerializeContext): string[] {
  const payload = block[block.type];
  const url = (payload && typeof payload === "object" && (payload as { url?: string }).url) ?? "";
  const title = getChildPageTitle(block);
  if (!url) return [];
  return [`<page url="${url}">${title}</page>`];
}
