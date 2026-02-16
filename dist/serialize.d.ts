import { a as NotionBlock, S as SerializeOptions, d as NotionRichText } from './types-DbI5MvjD.js';

declare function notionBlocksToMarkdown(blocks: NotionBlock[], options?: SerializeOptions): string;

/**
 * Convert a Notion rich text array to inline Notion-flavored Markdown.
 */
declare function richTextToInlineMarkdown(richText: NotionRichText[]): string;

export { notionBlocksToMarkdown, richTextToInlineMarkdown };
