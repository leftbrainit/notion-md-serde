import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";

export function visitDivider(_block: NotionBlock, _ctx: SerializeContext): string[] {
  return ["---"];
}
