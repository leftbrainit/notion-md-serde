import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";

function getImageUrl(block: NotionBlock): string {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  const p = payload as { file?: { url?: string }; external?: { url?: string } };
  return p.file?.url ?? p.external?.url ?? "";
}

function getImageCaption(block: NotionBlock): string {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  const cap = (payload as { caption?: { plain_text?: string }[] }).caption;
  if (!Array.isArray(cap) || cap.length === 0) return "";
  return cap.map((c) => c.plain_text ?? "").join("");
}

export function visitImage(block: NotionBlock, ctx: SerializeContext): string[] {
  const url = getImageUrl(block);
  const caption = getImageCaption(block);
  const alt = caption || "image";
  if (!url) return [];
  return [`${ctx.indent}![${alt}](${url})`];
}
