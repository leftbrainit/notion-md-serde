import type { NotionBlock, SerializeOptions } from "../types";

export interface SerializeContext {
  depth: number;
  tabs: string;
  options: Required<SerializeOptions>;
  visitChildren(blocks: NotionBlock[]): string[];
}

export type BlockVisitor = (block: NotionBlock, ctx: SerializeContext) => string[];
