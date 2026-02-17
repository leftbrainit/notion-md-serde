import type { NotionBlock, SerializeOptions } from "../types";

export interface ChildVisitOptions {
  /** Indent prefix for child lines (e.g., "  " for list nesting, "> " for blockquotes). */
  indent?: string;
  /** Offset to add to heading levels (e.g., 1 to promote child headings). */
  headingLevelOffset?: number;
}

export interface SerializeContext {
  /** Current line indent prefix (accumulated from parent). */
  indent: string;
  options: Required<SerializeOptions>;
  /** Heading level promotion offset from nesting (0 at top level). */
  headingLevelOffset: number;
  /** Current numbered list item number (1-based, 0 when not in a numbered list). */
  numberedListNumber: number;
  /** Recursively visit child blocks. Options control indent and heading promotion. */
  visitChildren(blocks: NotionBlock[], opts?: ChildVisitOptions): string[];
}

export type BlockVisitor = (block: NotionBlock, ctx: SerializeContext) => string[];
