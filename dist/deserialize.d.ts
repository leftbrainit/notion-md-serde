import { D as DeserializeOptions, a as NotionBlock, d as NotionRichText } from './types-DbI5MvjD.js';

declare function markdownToNotionBlocks(markdown: string, options?: DeserializeOptions): NotionBlock[];

/**
 * Parse inline Notion-flavored Markdown into a Notion rich text array.
 */
declare function inlineMarkdownToRichText(markdown: string, options?: {
    enforceNotionLimits?: boolean;
}): NotionRichText[];

export { inlineMarkdownToRichText, markdownToNotionBlocks };
