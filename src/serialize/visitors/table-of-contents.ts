import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";
import { getBlockColor } from "../block-helpers";
import { normalizeNotionColor } from "../../utils/colors";

export function visitTableOfContents(block: NotionBlock, _ctx: SerializeContext): string[] {
  const color = getBlockColor(block);
  const c = normalizeNotionColor(color);
  const attr = c !== "default" ? ` color="${c}"` : "";
  return [`<table_of_contents${attr}/>`];
}
