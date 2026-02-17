import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";
import { blockRichTextToMd, getBlockChildren } from "../block-helpers";

export function visitToggle(block: NotionBlock, ctx: SerializeContext): string[] {
  const md = blockRichTextToMd(block);
  const line = md ? `${ctx.indent}${md}` : "";
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  const lines: string[] = [];
  if (line) lines.push(line);
  lines.push(...childLines);
  return lines;
}
