import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";

function getChildPageTitle(block: NotionBlock): string {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  return (payload as { title?: string }).title ?? "";
}

export function visitChildPage(block: NotionBlock, ctx: SerializeContext): string[] {
  const title = getChildPageTitle(block);
  if (!title) return [];
  return [`${ctx.indent}[${title}](https://notion.so/${(block.id ?? "").replace(/-/g, "")})`];
}
