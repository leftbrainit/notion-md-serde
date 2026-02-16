## 1. Project setup

- [x] 1.1 Initialize package (package.json, name notion-md-serde, pnpm, no runtime Notion/MCP deps)
- [x] 1.2 Add TypeScript (strict), tsup (or unbuild) for ESM + CJS, Vitest, lint (Biome or ESLint)
- [x] 1.3 Configure entry points: main/module/types and exports for `.`, optional `./serialize`, `./deserialize`
- [x] 1.4 Create `src/` layout: index.ts, types.ts, serialize/, deserialize/, utils/

## 2. Types and utils

- [x] 2.1 Define and export NotionBlock, NotionRichText, NotionAnnotations, NotionColor, SerializeOptions, DeserializeOptions in src/types.ts
- [x] 2.2 Implement utils/colors.ts: color name validation and mapping for block/inline color
- [x] 2.3 Implement utils/escaping.ts: backslash escape handling for serialize and deserialize
- [x] 2.4 Implement utils/indentation.ts: tab-based nesting (depth → tab string, parse indent from line)

## 3. Rich text (both directions)

- [x] 3.1 Implement richTextToInlineMarkdown: annotations (bold, italic, strikethrough, underline, code), links, equations, mentions (page, database, user, date), combined annotations, escaping
- [x] 3.2 Implement inlineMarkdownToRichText: parse escapes, inline code, bold/italic/strike/underline, links, inline equations, mention tags; build NotionRichText[] with correct type and annotations
- [x] 3.3 Add optional splitting when over 2000 chars per element (when enforceNotionLimits or equivalent is used)
- [x] 3.4 Add inline color support if spec is finalized (serialize/deserialize color in rich text)

## 4. Serialize pipeline

- [x] 4.1 Implement serialize/index.ts: notionBlocksToMarkdown entry point, block visitor loop, indentation context, options (unknownBlockBehavior, includeBlockIds)
- [x] 4.2 Implement visitors for standard blocks: paragraph, heading_1/2/3, bulleted_list_item, numbered_list_item, to_do, quote, divider, code, equation, image (markdown and XML variant)
- [x] 4.3 Implement visitors for toggle blocks: toggle, heading_1/2/3 with is_toggleable
- [x] 4.4 Implement visitors for XML-style blocks: callout, bookmark, embed, video, audio, file, pdf, table (with colgroup/col/tr/td, colors), column_list/column, synced_block, child_page, child_database, table_of_contents, breadcrumb, link_preview
- [x] 4.5 Implement unknown block handling: omit, comment, or placeholder per SerializeOptions
- [x] 4.6 Ensure deterministic output: fixed attribute order, no trailing spaces, consistent newlines, sorted/fixed XML attributes; optional block ID comments when includeBlockIds
- [x] 4.7 Add block-level color: append ` {color="Color"}` only when color is not default

## 5. Deserialize pipeline

- [x] 5.1 Implement tokenizer: line-level tokens for heading (level, toggleable, content, color), paragraph, bulleted_list, numbered_list, todo, toggle, quote, divider, code (start/content/end), equation (start/content/end), XML (open/close/self-closing), image, empty_block, indent increase/decrease
- [x] 5.2 Implement parser/tree builder: build block tree from token stream using tab indentation; handle XML tag spanning and nesting (table, column_list, synced_block, etc.)
- [x] 5.3 Implement emitters: map parsed tokens/AST to Notion blocks (type + type-specific props); call rich-text deserializer for content strings
- [x] 5.4 Support strict vs lenient: strict fails or errors on unknown syntax; lenient passes through as paragraph
- [x] 5.5 Normalize H4–H6 to heading_3; multiple `>` lines to separate quote blocks; standard markdown compatibility
- [x] 5.6 Enforce Notion limits when option set: split rich text over 2000 chars into multiple elements
- [x] 5.7 Parse `<empty-block/>` as explicit empty paragraph; ignore blank lines for block boundaries

## 6. Public API and exports

- [x] 6.1 Export from src/index.ts: notionBlocksToMarkdown, markdownToNotionBlocks, richTextToInlineMarkdown, inlineMarkdownToRichText
- [x] 6.2 Re-export types from index (NotionBlock, NotionRichText, options)
- [x] 6.3 Add subpath exports for ./serialize and ./deserialize if design confirms

## 7. Tests

- [x] 7.1 Add round-trip tests: blocks → markdown → blocks, assert functional equivalence (types, content, nesting, colors)
- [x] 7.2 Add snapshot tests per block type: paired JSON fixture and expected markdown in __snapshots__ or equivalent
- [x] 7.3 Add property-based tests (e.g. fast-check): invariants (length, block types, nesting depth, colors) for random valid block trees
- [x] 7.4 Add edge-case tests: empty block, whitespace-only blocks, rich text over 2000 chars, deep nesting, tables with colors, toggle headings, blockquote with \<br\>, backslash escapes, adjacent list types, code blocks with markdown-like content, standard markdown input
- [x] 7.5 Add unit tests for rich-text serialize/deserialize (annotations, mentions, equations, links, combinations)
