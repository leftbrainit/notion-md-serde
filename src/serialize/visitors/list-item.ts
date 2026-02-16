import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";
import { blockRichTextToMd, colorSuffix, getBlockChildren } from "../block-helpers";

export function visitBulletedList(block: NotionBlock, ctx: SerializeContext): string[] {
  const md = blockRichTextToMd(block);
  const color = colorSuffix(block);
  const line = `- ${md}${color}`.trimEnd();
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  return [line, ...childLines];
}

export function visitNumberedList(block: NotionBlock, ctx: SerializeContext): string[] {
  const md = blockRichTextToMd(block);
  const color = colorSuffix(block);
  const line = `1. ${md}${color}`.trimEnd();
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  return [line, ...childLines];
}

export function visitToDo(block: NotionBlock, ctx: SerializeContext): string[] {
  const payload = block[block.type];
  const checked = payload && typeof payload === "object" && (payload as { checked?: boolean }).checked;
  const box = checked ? "[x]" : "[ ]";
  const md = blockRichTextToMd(block);
  const color = colorSuffix(block);
  const line = `- ${box} ${md}${color}`.trimEnd();
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  return [line, ...childLines];
}
