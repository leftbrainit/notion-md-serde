import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";

function getLinkPreviewUrl(block: NotionBlock): string {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  return (payload as { url?: string }).url ?? "";
}

export function visitLinkPreview(block: NotionBlock, ctx: SerializeContext): string[] {
  const url = getLinkPreviewUrl(block);
  if (!url) return [];
  return [`${ctx.indent}[${url}](${url})`];
}
