import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";

export function visitDivider(_block: NotionBlock, ctx: SerializeContext): string[] {
  return [`${ctx.indent}---`];
}
