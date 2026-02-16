import type { NotionBlock, DeserializeOptions } from "../types";
import { tokenize } from "./tokenizer";
import { parseToBlockTree } from "./parser";
import { emitBlocks } from "./emitter";

export function markdownToNotionBlocks(
  markdown: string,
  options?: DeserializeOptions,
): NotionBlock[] {
  const tokens = tokenize(markdown);
  const nodes = parseToBlockTree(tokens);
  return emitBlocks(nodes, options);
}
