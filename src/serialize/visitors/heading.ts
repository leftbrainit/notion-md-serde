import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";
import { blockRichTextToMd, getBlockChildren } from "../block-helpers";

export function visitHeading(
  block: NotionBlock,
  ctx: SerializeContext,
  level: 1 | 2 | 3,
): string[] {
  const actualLevel = Math.min(level + ctx.headingLevelOffset, 6) as 1 | 2 | 3 | 4 | 5 | 6;
  const prefix = "#".repeat(actualLevel);
  const md = blockRichTextToMd(block, { suppressBold: true });
  const line = md ? `${ctx.indent}${prefix} ${md}` : `${ctx.indent}${prefix}`;

  const children = getBlockChildren(block);
  if (!children.length) return [line];
  const childLines = ctx.visitChildren(children, {
    indent: ctx.indent,
    headingLevelOffset: ctx.headingLevelOffset + 1,
  });
  return [line, "", ...childLines];
}
