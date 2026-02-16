import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";
import { getBlockChildren } from "../block-helpers";

export function visitColumnList(block: NotionBlock, ctx: SerializeContext): string[] {
  const children = getBlockChildren(block);
  const columnBlocks = children.filter((b) => b.type === "column");
  const lines: string[] = ["<column_list>"];
  for (const col of columnBlocks) {
    const payload = col[col.type];
    const ratio = (payload && typeof payload === "object" && (payload as { width_ratio?: number }).width_ratio) ?? 0.5;
    const colChildren = (payload && typeof payload === "object" && (payload as { children?: NotionBlock[] }).children) ?? [];
    lines.push(`<column width_ratio="${ratio}">`);
    if (colChildren.length) lines.push(...ctx.visitChildren(colChildren));
    lines.push("</column>");
  }
  lines.push("</column_list>");
  return lines;
}
