import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";

function getDatabaseTitle(block: NotionBlock): string {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  return (payload as { title?: string }).title ?? "";
}

export function visitChildDatabase(block: NotionBlock, _ctx: SerializeContext): string[] {
  const payload = block[block.type];
  const url = (payload && typeof payload === "object" && (payload as { url?: string }).url) ?? "";
  const title = getDatabaseTitle(block);
  if (!url) return [];
  return [`<database url="${url}">${title}</database>`];
}
