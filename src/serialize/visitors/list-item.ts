import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";
import { blockRichTextToMd, getBlockChildren, getBlockRichText } from "../block-helpers";

function isAllBold(block: NotionBlock): boolean {
  const rt = getBlockRichText(block);
  if (rt.length === 0) return false;
  return rt.every((r) => r.annotations?.bold === true);
}

export function visitBulletedList(block: NotionBlock, ctx: SerializeContext): string[] {
  const md = blockRichTextToMd(block);
  const children = getBlockChildren(block);

  if (
    isAllBold(block) &&
    children.length === 1 &&
    children[0].type === "bulleted_list_item" &&
    !getBlockChildren(children[0]).length
  ) {
    const childMd = blockRichTextToMd(children[0]);
    if (childMd) {
      const merged = `${ctx.indent}- ${md} — ${childMd}`.trimEnd();
      return [merged];
    }
  }

  const line = `${ctx.indent}- ${md}`.trimEnd();
  const childLines = children.length
    ? ctx.visitChildren(children, { indent: ctx.indent + "  " })
    : [];
  return [line, ...childLines];
}

export function visitNumberedList(block: NotionBlock, ctx: SerializeContext): string[] {
  const md = blockRichTextToMd(block);
  const num = ctx.numberedListNumber || 1;
  const line = `${ctx.indent}${num}. ${md}`.trimEnd();
  const children = getBlockChildren(block);
  const childLines = children.length
    ? ctx.visitChildren(children, { indent: ctx.indent + "  " })
    : [];
  return [line, ...childLines];
}

export function visitToDo(block: NotionBlock, ctx: SerializeContext): string[] {
  const payload = block[block.type];
  const checked = payload && typeof payload === "object" && (payload as { checked?: boolean }).checked;
  const box = checked ? "[x]" : "[ ]";
  const md = blockRichTextToMd(block);
  const line = `${ctx.indent}- ${box} ${md}`.trimEnd();
  const children = getBlockChildren(block);
  const childLines = children.length
    ? ctx.visitChildren(children, { indent: ctx.indent + "  " })
    : [];
  return [line, ...childLines];
}
