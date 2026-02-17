import type { NotionBlock, SerializeOptions } from "../types";
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
  const lines = visitBlocks(blocks, opts, "", 0);
  return cleanupOutput(lines).join("\n");
}

function cleanupOutput(lines: string[]): string[] {
  const result: string[] = [];
  for (const line of lines) {
    const lastLine = result.length > 0 ? result[result.length - 1] : undefined;
    if (line === "" && lastLine === "") continue;
    if (line.trimEnd() === "---") {
      if (lastLine?.trimEnd() === "---") continue;
      if (lastLine === "" && result.length >= 2 && result[result.length - 2].trimEnd() === "---") {
        result.pop();
        continue;
      }
    }
    result.push(line);
  }
  return result;
}

const LIST_TYPES = new Set([
  "bulleted_list_item",
  "numbered_list_item",
  "to_do",
]);

function shouldAddBlankLine(prevType: string, curType: string): boolean {
  if (LIST_TYPES.has(prevType) && LIST_TYPES.has(curType) && prevType === curType) {
    return false;
  }
  return true;
}

/**
 * Reorder dividers that immediately follow headings to the end of each section.
 * Transforms: [heading, divider, content..., heading, divider, content...]
 * Into:       [heading, content..., divider, heading, content..., divider]
 */
function reorderDividersAfterHeadings(blocks: NotionBlock[]): NotionBlock[] {
  const hasPattern = blocks.some(
    (b, i) =>
      b.type.startsWith("heading_") &&
      i + 1 < blocks.length &&
      blocks[i + 1].type === "divider",
  );
  if (!hasPattern) return blocks;

  const result: NotionBlock[] = [];
  let i = 0;
  while (i < blocks.length) {
    if (
      blocks[i].type.startsWith("heading_") &&
      i + 1 < blocks.length &&
      blocks[i + 1].type === "divider"
    ) {
      result.push(blocks[i]);
      i += 2;
      const sectionContent: NotionBlock[] = [];
      while (i < blocks.length && !(blocks[i].type.startsWith("heading_") || blocks[i].type === "divider")) {
        sectionContent.push(blocks[i]);
        i++;
      }
      result.push(...sectionContent);
      result.push({ type: "divider", divider: {} } as NotionBlock);
    } else {
      result.push(blocks[i]);
      i++;
    }
  }
  return result;
}

export function visitBlocks(
  blocks: NotionBlock[],
  options: Required<SerializeOptions>,
  indent: string,
  headingLevelOffset: number,
): string[] {
  const orderedBlocks = reorderDividersAfterHeadings(blocks);
  const lines: string[] = [];
  let numberedListCount = 0;

  for (let i = 0; i < orderedBlocks.length; i++) {
    const block = orderedBlocks[i];

    if (block.type === "numbered_list_item") {
      numberedListCount++;
    } else {
      numberedListCount = 0;
    }

    if (i > 0 && shouldAddBlankLine(orderedBlocks[i - 1].type, block.type)) {
      lines.push("");
    }

    const ctx: SerializeContext = {
      indent,
      options,
      headingLevelOffset,
      numberedListNumber: numberedListCount,
      visitChildren(children, opts?) {
        const childIndent = opts?.indent ?? indent;
        const childHLO = opts?.headingLevelOffset ?? headingLevelOffset;
        return visitBlocks(children, options, childIndent, childHLO);
      },
    };

    if (options.includeBlockIds && block.id) {
      lines.push(`${indent}<!-- block-id: ${block.id} -->`);
    }

    const visitor = getVisitor(block.type);
    const blockLines = visitor
      ? visitor(block, ctx)
      : visitUnknown(block, ctx);
    lines.push(...blockLines);
  }
  return lines;
}
