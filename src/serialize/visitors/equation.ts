import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";

export function visitEquation(block: NotionBlock, ctx: SerializeContext): string[] {
  const payload = block[block.type];
  const expr = (payload && typeof payload === "object" && (payload as { expression?: string }).expression) || "";
  return [`${ctx.indent}$$ ${expr} $$`];
}
