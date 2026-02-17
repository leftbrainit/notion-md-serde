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

  const rows: string[][] = [];
  for (const rowBlock of tableBlocks) {
    if (rowBlock.type !== "table_row") continue;
    const rowPayload = rowBlock[rowBlock.type];
    const cellsRaw = (rowPayload && typeof rowPayload === "object" && (rowPayload as { cells?: { rich_text?: unknown[] }[] }).cells);
    const cells = Array.isArray(cellsRaw) ? cellsRaw : [];
    const row = cells.map((cell: { rich_text?: unknown[] }) => {
      const rt = Array.isArray(cell?.rich_text) ? cell.rich_text : [];
      return richTextToInlineMarkdown(rt as import("../../types").NotionRichText[]);
    });
    rows.push(row);
  }

  if (rows.length === 0) return [];

  const colCount = Math.max(...rows.map((r) => r.length));
  const lines: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i];
    while (cells.length < colCount) cells.push("");
    lines.push(`${ctx.indent}| ${cells.join(" | ")} |`);
    if (i === 0) {
      lines.push(`${ctx.indent}| ${cells.map(() => "---").join(" | ")} |`);
    }
  }
  return lines;
}
