import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";

export function visitUnknown(block: NotionBlock, ctx: SerializeContext): string[] {
  const behavior = ctx.options.unknownBlockBehavior;
  if (behavior === "omit") return [];
  if (behavior === "comment") {
    return [`${ctx.indent}<!-- unknown block type: ${block.type} -->`];
  }
  return [`${ctx.indent}<!-- unsupported: ${block.type} -->`];
}
