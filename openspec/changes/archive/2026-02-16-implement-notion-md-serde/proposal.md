## Why

Notion's "Notion-flavored Markdown" format (toggles, callouts, colored blocks, database refs, etc.) exists only inside Notion's hosted MCP server. Developers who need markdown ↔ Notion block conversion in editors, migrations, CLIs, or edge runtimes have no standalone library and must use raw block JSON or standard markdown tools that miss Notion-specific features. This change implements a zero-dependency, spec-faithful TypeScript library for bidirectional conversion so the format is usable everywhere.

## What Changes

- **New package** `notion-md-serde`: standalone TypeScript library (no Notion API or MCP dependency).
- **Core API**: `notionBlocksToMarkdown(blocks)`, `markdownToNotionBlocks(markdown)`, plus `richTextToInlineMarkdown` / `inlineMarkdownToRichText` for rich text.
- **Types**: Export Notion-compatible interfaces (`NotionBlock`, `NotionRichText`, annotations, colors) without depending on `@notionhq/client`.
- **Serialize pipeline**: Block visitor pattern; one visitor per block type; tab-based indentation for children; deterministic output and optional block IDs in comments.
- **Deserialize pipeline**: Line-level tokenizer (tabs, toggle prefix, color attributes, XML tags), tree builder from indentation, AST → Notion block emitters.
- **Notion-flavored Markdown support**: All block types from the spec (paragraphs, headings, lists, to-do, blockquote, divider, code, equation, image, toggle/toggle headings, table, callout, bookmark, embed, media, column_list, synced_block, child_page, child_database, table_of_contents, breadcrumb, link_preview, empty-block); inline formatting (bold, italic, strikethrough, underline, code, link, equation, mentions); block and inline colors; optional Notion API limit enforcement (e.g. 2000 chars per rich text element).
- **Build and test**: ESM + CJS dual output, Vitest with round-trip and snapshot tests, strict TypeScript.

## Capabilities

### New Capabilities

- `public-api`: Exported functions (`notionBlocksToMarkdown`, `markdownToNotionBlocks`, `richTextToInlineMarkdown`, `inlineMarkdownToRichText`), shared types (`NotionBlock`, `NotionRichText`, annotations, colors), and options (`SerializeOptions`, `DeserializeOptions`).
- `markdown-syntax`: Notion-flavored Markdown specification — indentation (tabs only), escaping, empty lines, block colors, child nesting; all block types (standard, toggle, XML tags); color values; inline formatting and mention tags; rich text limits.
- `serialize`: Serializer pipeline (blocks → markdown): block visitors, rich-text-to-inline markdown, tab-based indentation, deterministic output, unknown-block behavior, optional block IDs.
- `deserialize`: Deserializer pipeline (markdown → blocks): tokenizer (line-level, tabs, toggle prefix, color attributes, XML), tree from indentation, AST to Notion block emitters, strict vs lenient, optional Notion limit enforcement.
- `rich-text`: Rich text both directions: annotations (bold, italic, strikethrough, underline, code), links, inline equations, mentions (page, database, user, date), color; escaping; combination handling; API limit splitting when enabled.

### Modified Capabilities

- *(none — greenfield implementation)*

## Impact

- **New codebase**: New `src/` tree (types, serialize/, deserialize/, utils/), `index.ts` exports, no changes to existing code.
- **Dependencies**: Zero runtime Notion/MCP dependencies; dev/build: TypeScript, tsup (or unbuild), Vitest, lint (e.g. Biome or ESLint).
- **Consumers**: Any Node, Deno, browser, or edge environment that needs Notion-flavored Markdown ↔ block JSON conversion.
- **Scope**: Content blocks and rich text only; no database properties, API calls, file uploads, or page-level metadata.
