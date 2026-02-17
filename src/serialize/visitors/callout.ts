import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";
import { blockRichTextToMd, getBlockChildren } from "../block-helpers";

/**
 * Attempt to merge a callout's toggle+paragraph children into a single line.
 * Pattern: callout (empty text) → toggle "Title" → paragraph "Description"
 * Result: > **Title** — Description
 */
function tryMergeToggleParagraph(
  children: NotionBlock[],
  indent: string,
): string | null {
  const renderable = children.filter((c) => {
    if (c.type === "toggle") return true;
    if (c.type === "paragraph") {
      const md = blockRichTextToMd(c);
      return !!md;
    }
    return false;
  });
  if (renderable.length !== 2) return null;
  if (renderable[0].type !== "toggle" || renderable[1].type !== "paragraph") return null;

  const toggleMd = blockRichTextToMd(renderable[0]);
  const paraMd = blockRichTextToMd(renderable[1]);
  if (!toggleMd || !paraMd) return null;

  return `${indent}> ${toggleMd} — ${paraMd}`;
}

export function visitCallout(block: NotionBlock, ctx: SerializeContext): string[] {
  const md = blockRichTextToMd(block);
  const children = getBlockChildren(block);
  const baseIndent = ctx.indent.replace(/^ +/, "");

  if (!md && children.length > 0) {
    const merged = tryMergeToggleParagraph(children, baseIndent);
    if (merged) return [merged];
  }

  const lines: string[] = [];

  if (md) {
    lines.push(`${baseIndent}> ${md}`);
  }

  if (children.length) {
    const childLines = ctx.visitChildren(children, {
      indent: baseIndent + "> ",
    });
    lines.push(...childLines);
  }

  if (lines.length === 0) {
    lines.push(`${baseIndent}>`);
  }

  return lines;
}
