import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";

function getDatabaseTitle(block: NotionBlock): string {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  return (payload as { title?: string }).title ?? "";
}

export function visitChildDatabase(block: NotionBlock, ctx: SerializeContext): string[] {
  const title = getDatabaseTitle(block);
  if (!title || title === "Untitled") return [];
  return [`${ctx.indent}[${title}](https://notion.so/${(block.id ?? "").replace(/-/g, "")})`];
}
