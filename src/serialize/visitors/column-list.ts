import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";
import { getBlockChildren } from "../block-helpers";

export function visitColumnList(block: NotionBlock, ctx: SerializeContext): string[] {
  const children = getBlockChildren(block);
  const columnBlocks = children.filter((b) => b.type === "column");
  const lines: string[] = [];
  for (const col of columnBlocks) {
    const payload = col[col.type];
    const colChildren: NotionBlock[] = (payload && typeof payload === "object" && Array.isArray((payload as { children?: NotionBlock[] }).children)) ? (payload as { children: NotionBlock[] }).children : [];
    if (colChildren.length) {
      if (lines.length > 0) lines.push("");
      lines.push(...ctx.visitChildren(colChildren));
    }
  }
  return lines;
}
