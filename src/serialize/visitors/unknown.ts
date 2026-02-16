import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";

export function visitUnknown(block: NotionBlock, ctx: SerializeContext): string[] {
  const behavior = ctx.options.unknownBlockBehavior;
  if (behavior === "omit") return [];
  if (behavior === "comment") {
    return [`<!-- unknown block type: ${block.type} -->`];
  }
  const id = block.id ? ` url="https://notion.so/..." alt="${block.type}"` : ` alt="${block.type}"`;
  return [`<unknown${id}/>`];
}
