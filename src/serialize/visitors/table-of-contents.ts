import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";

export function visitTableOfContents(_block: NotionBlock, _ctx: SerializeContext): string[] {
  return [];
}
