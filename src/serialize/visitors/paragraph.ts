import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";
import { blockRichTextToMd, getBlockChildren } from "../block-helpers";

export function visitParagraph(block: NotionBlock, ctx: SerializeContext): string[] {
  const md = blockRichTextToMd(block);
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  if (!md && !childLines.length) return [];
  const line = ctx.indent + md;
  return [line, ...childLines];
}
