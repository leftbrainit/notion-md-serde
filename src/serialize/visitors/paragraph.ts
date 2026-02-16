import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";
import { blockRichTextToMd, colorSuffix, getBlockChildren } from "../block-helpers";

export function visitParagraph(block: NotionBlock, ctx: SerializeContext): string[] {
  const md = blockRichTextToMd(block);
  const color = colorSuffix(block);
  const line = (md || "") + color;
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  return [line, ...childLines];
}
