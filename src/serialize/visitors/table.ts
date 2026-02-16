import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";
import { richTextToInlineMarkdown } from "../rich-text";

function getTablePayload(block: NotionBlock) {
  const payload = block[block.type];
  return payload && typeof payload === "object" ? (payload as { table_width?: number; has_column_header?: boolean; has_row_header?: boolean; children?: NotionBlock[] }) : null;
}

export function visitTable(block: NotionBlock, ctx: SerializeContext): string[] {
  const payload = getTablePayload(block);
  if (!payload) return [];
  const children = payload.children ?? [];
  const tableBlocks = Array.isArray(children) ? children : [];
  const attrs: string[] = [];
  if (payload.has_column_header !== undefined) attrs.push(`header-row="${payload.has_column_header}"`);
  if (payload.has_row_header !== undefined) attrs.push(`header-column="${payload.has_row_header}"`);
  const attrStr = attrs.length ? " " + attrs.join(" ") : "";
  const lines = [`<table${attrStr}>`];
  // Notion table: first child is table_row blocks; we don't have colgroup in API typically
  for (const rowBlock of tableBlocks) {
    if (rowBlock.type !== "table_row") continue;
    const rowPayload = rowBlock[rowBlock.type];
    const cells = (rowPayload && typeof rowPayload === "object" && (rowPayload as { cells?: { rich_text?: unknown[] }[] }).cells) ?? [];
    const cellParts = cells.map((cell: { rich_text?: unknown[] }) => {
      const rt = Array.isArray(cell?.rich_text) ? cell.rich_text : [];
      const md = richTextToInlineMarkdown(rt as import("../../types").NotionRichText[]);
      return `<td>${md}</td>`;
    });
    lines.push("<tr>" + cellParts.join("") + "</tr>");
  }
  lines.push("</table>");
  return lines;
}
