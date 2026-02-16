import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";
import { blockRichTextToMd, getBlockChildren } from "../block-helpers";
import { normalizeNotionColor } from "../../utils/colors";

function attr(key: string, value: string | undefined): string {
  return value !== undefined && value !== "" ? ` ${key}="${value}"` : "";
}

export function visitCallout(block: NotionBlock, ctx: SerializeContext): string[] {
  const payload = block[block.type];
  const p = payload && typeof payload === "object" ? (payload as { icon?: { emoji?: string }; color?: string }) : {};
  const icon = p.icon?.emoji ?? "";
  const color = normalizeNotionColor(p.color);
  const md = blockRichTextToMd(block);
  const open = `<callout${attr("icon", icon)}${color !== "default" ? attr("color", color) : ""}>`;
  const close = "</callout>";
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  return [open + md + close, ...childLines];
}
