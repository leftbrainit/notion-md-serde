import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";
import { getBlockChildren } from "../block-helpers";

export function visitSyncedBlock(block: NotionBlock, ctx: SerializeContext): string[] {
  const children = getBlockChildren(block);
  if (children.length) {
    return ctx.visitChildren(children);
  }
  return [];
}
