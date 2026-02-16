import type { NotionBlock, SerializeOptions } from "../types";
import { tabsForDepth } from "../utils/indentation";
import type { SerializeContext } from "./types";
import { getVisitor, visitUnknown } from "./visitors";

export function notionBlocksToMarkdown(
  blocks: NotionBlock[],
  options?: SerializeOptions,
): string {
  const opts: Required<SerializeOptions> = {
    unknownBlockBehavior: options?.unknownBlockBehavior ?? "placeholder",
    includeBlockIds: options?.includeBlockIds ?? false,
  };
  const lines = visitBlocks(blocks, 0, opts);
  return lines.join("\n");
}

export function visitBlocks(
  blocks: NotionBlock[],
  depth: number,
  options: Required<SerializeOptions>,
): string[] {
  const lines: string[] = [];
  const tabs = tabsForDepth(depth);
  const ctx: SerializeContext = {
    depth,
    tabs,
    options,
    visitChildren(children) {
      return visitBlocks(children, depth + 1, options);
    },
  };
  for (const block of blocks) {
    if (options.includeBlockIds && block.id) {
      lines.push(tabs + `<!-- block-id: ${block.id} -->`);
    }
    const visitor = getVisitor(block.type);
    const blockLines = visitor
      ? visitor(block, ctx)
      : visitUnknown(block, ctx);
    for (const line of blockLines) {
      // Child lines already have their indent from recursive visitBlocks
      const isChildLine = line.startsWith("\t");
      lines.push(line ? (isChildLine ? line : tabs + line) : line);
    }
  }
  return lines;
}
