import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";

export function visitLinkToPage(block: NotionBlock, ctx: SerializeContext): string[] {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return [];
  const p = payload as { type?: string; page_id?: string; database_id?: string };
  const id = p.page_id ?? p.database_id ?? "";
  if (!id) return [];
  const cleanId = id.replace(/-/g, "");
  return [`${ctx.indent}[Link to page](https://notion.so/${cleanId})`];
}
