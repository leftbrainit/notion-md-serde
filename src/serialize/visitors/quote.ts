import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";
import { blockRichTextToMd, getBlockChildren } from "../block-helpers";

export function visitQuote(block: NotionBlock, ctx: SerializeContext): string[] {
  const md = blockRichTextToMd(block);
  const line = `${ctx.indent}> ${md}`.trimEnd();
  const children = getBlockChildren(block);
  const childLines = children.length
    ? ctx.visitChildren(children, { indent: ctx.indent + "> " })
    : [];
  return [line, ...childLines];
}
