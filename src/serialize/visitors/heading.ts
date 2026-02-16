import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";
import { blockRichTextToMd, colorSuffix, getBlockChildren } from "../block-helpers";

export function visitHeading(
  block: NotionBlock,
  ctx: SerializeContext,
  level: 1 | 2 | 3,
): string[] {
  const payload = block[block.type];
  const isToggleable = payload && typeof payload === "object" && (payload as { is_toggleable?: boolean }).is_toggleable;
  const prefix = isToggleable ? "▶" + "#".repeat(level) : "#".repeat(level);
  const md = blockRichTextToMd(block);
  const color = colorSuffix(block);
  const line = `${prefix} ${md}${color}`.trimEnd();
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  return [line, ...childLines];
}
