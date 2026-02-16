import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";

function getEmbedUrl(block: NotionBlock): string {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  return (payload as { url?: string }).url ?? "";
}

function getEmbedCaption(block: NotionBlock): string {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  const cap = (payload as { caption?: { plain_text?: string }[] }).caption;
  if (!Array.isArray(cap) || cap.length === 0) return "";
  return cap.map((c) => c.plain_text ?? "").join("");
}

export function visitEmbed(block: NotionBlock, _ctx: SerializeContext): string[] {
  const url = getEmbedUrl(block);
  const caption = getEmbedCaption(block);
  if (!url) return [];
  return [`<embed url="${url}">${caption}</embed>`];
}
