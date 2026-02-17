import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";

function getPdfUrl(block: NotionBlock): string {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  const p = payload as { file?: { url?: string }; external?: { url?: string } };
  return p.file?.url ?? p.external?.url ?? "";
}

function getPdfCaption(block: NotionBlock): string {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  const cap = (payload as { caption?: { plain_text?: string }[] }).caption;
  if (!Array.isArray(cap) || cap.length === 0) return "";
  return cap.map((c) => c.plain_text ?? "").join("");
}

export function visitPdf(block: NotionBlock, ctx: SerializeContext): string[] {
  const url = getPdfUrl(block);
  const caption = getPdfCaption(block);
  if (!url) return [];
  const label = caption || "PDF";
  return [`${ctx.indent}[${label}](${url})`];
}
