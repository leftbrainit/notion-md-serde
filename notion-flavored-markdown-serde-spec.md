# `notion-md-serde` — Package Specification

A standalone TypeScript library for bidirectional conversion between Notion-flavored Markdown and Notion API block JSON. No MCP, no protocol overhead — just pure functions.

---

## 1. Problem Statement

Notion's hosted MCP server includes a proprietary "Notion-flavored Markdown" format that extends standard Markdown with Notion-specific block types (toggles, callouts, colored blocks, database references, etc.). This format is used for all content read/write operations in the MCP server and provides near-feature-parity with Notion's block system.

However, this conversion logic is **not available** as a standalone library. It only exists inside Notion's hosted MCP infrastructure. Developers who want to work with Notion content in markdown form — in editors, migration scripts, CLI tools, or edge functions — must either use the raw block JSON API or settle for standard markdown libraries that miss Notion-specific features.

This package fills that gap.

---

## 2. Goals

1. **Bidirectional conversion**: `notionBlocksToMarkdown(blocks) → string` and `markdownToNotionBlocks(markdown) → blocks`
2. **Spec-faithful**: Match the Notion-flavored Markdown specification as closely as possible (documented below in Section 5)
3. **Round-trip fidelity**: `parse(serialize(blocks))` should produce functionally equivalent block JSON
4. **Zero runtime dependencies on Notion**: Pure functions, no API calls, no auth
5. **Tree-shakeable and isomorphic**: Works in Node.js, Deno, browsers, and edge runtimes
6. **Incremental adoption**: Standard markdown input produces valid Notion blocks even without Notion extensions

---

## 3. Public API

### 3.1 Core Functions

```typescript
// Serialize: Notion API blocks → Notion-flavored Markdown string
export function notionBlocksToMarkdown(
  blocks: NotionBlock[],
  options?: SerializeOptions
): string;

// Deserialize: Notion-flavored Markdown string → Notion API blocks
export function markdownToNotionBlocks(
  markdown: string,
  options?: DeserializeOptions
): NotionBlock[];

// Rich text subset (for properties, comments, etc.)
export function richTextToInlineMarkdown(
  richText: NotionRichText[]
): string;

export function inlineMarkdownToRichText(
  markdown: string
): NotionRichText[];
```

### 3.2 Types

```typescript
// These mirror the Notion API types from @notionhq/client
// but the package should NOT depend on @notionhq/client at runtime.
// Instead, define compatible interfaces and export them.

interface NotionBlock {
  type: string;
  [key: string]: any;  // heading_1, paragraph, callout, etc.
}

interface NotionRichText {
  type: 'text' | 'mention' | 'equation';
  text?: { content: string; link?: { url: string } | null };
  mention?: NotionMention;
  equation?: { expression: string };
  annotations?: NotionAnnotations;
  plain_text?: string;
  href?: string | null;
}

interface NotionAnnotations {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  underline: boolean;
  code: boolean;
  color: NotionColor;
}

type NotionColor =
  | 'default'
  | 'gray' | 'brown' | 'orange' | 'yellow' | 'green'
  | 'blue' | 'purple' | 'pink' | 'red'
  | 'gray_background' | 'brown_background' | 'orange_background'
  | 'yellow_background' | 'green_background' | 'blue_background'
  | 'purple_background' | 'pink_background' | 'red_background';
```

### 3.3 Options

```typescript
interface SerializeOptions {
  // How to handle block types not in the spec
  unknownBlockBehavior?: 'omit' | 'comment' | 'placeholder';
  // Whether to include Notion block IDs as HTML comments
  includeBlockIds?: boolean;
}

interface DeserializeOptions {
  // Strict mode fails on unknown syntax; lenient mode passes through as paragraphs
  strict?: boolean;
  // Notion API limits: auto-split rich text exceeding 2000 chars per element
  enforceNotionLimits?: boolean;
}
```

---

## 4. Architecture

### 4.1 Serializer Pipeline (blocks → markdown)

```
NotionBlock[] → Block Visitor (recursive) → Markdown string
```

Each Notion block type has a dedicated visitor function that:
1. Converts the block's rich text to inline markdown
2. Emits the correct markdown syntax (including Notion extensions)
3. Recursively processes children with increased indentation (tab-based)

### 4.2 Deserializer Pipeline (markdown → blocks)

```
Markdown string → Tokenizer/Parser → AST → Block Emitter → NotionBlock[]
```

The parser needs to handle:
1. **Standard markdown** — use a base parser (e.g., `unified`/`remark-parse` or a custom tokenizer)
2. **Notion extensions** — custom syntax for color attributes, toggle prefixes, HTML-like tags
3. **Tab-based nesting** — convert indentation levels to parent-child block relationships

### 4.3 Module Structure

```
src/
├── index.ts                    # Public API exports
├── types.ts                    # NotionBlock, NotionRichText interfaces
├── serialize/
│   ├── index.ts                # notionBlocksToMarkdown entry point
│   ├── visitors/               # One file per block type
│   │   ├── paragraph.ts
│   │   ├── heading.ts
│   │   ├── list-item.ts
│   │   ├── toggle.ts
│   │   ├── callout.ts
│   │   ├── table.ts
│   │   ├── code.ts
│   │   ├── equation.ts
│   │   ├── bookmark.ts
│   │   ├── embed.ts
│   │   ├── image.ts
│   │   ├── column-list.ts
│   │   ├── synced-block.ts
│   │   ├── child-page.ts
│   │   ├── child-database.ts
│   │   └── ...
│   └── rich-text.ts            # richTextToInlineMarkdown
├── deserialize/
│   ├── index.ts                # markdownToNotionBlocks entry point
│   ├── tokenizer.ts            # Line-level tokenizer
│   ├── parser.ts               # AST builder from tokens
│   ├── emitters/               # AST node → NotionBlock
│   │   ├── paragraph.ts
│   │   ├── heading.ts
│   │   └── ...
│   └── rich-text.ts            # inlineMarkdownToRichText
└── utils/
    ├── colors.ts               # Color name validation/mapping
    ├── escaping.ts             # Backslash escape handling
    └── indentation.ts          # Tab-based nesting logic
```

---

## 5. Notion-Flavored Markdown Specification

This is the specification the package must implement. It is reconstructed from Notion's MCP server tool descriptions and observed output. The spec is a **superset of standard Markdown**.

### 5.1 General Rules

| Rule | Detail |
|------|--------|
| **Indentation** | Tabs only. Spaces are NOT valid for nesting. Each indent level = 1 tab character. |
| **Escaping** | Backslash escapes: `\*` renders as literal `*`, not bold delimiter. |
| **Empty lines** | Ignored for spacing (Notion handles block spacing). Use `<empty-block/>` on its own line to insert an explicit empty paragraph block. |
| **Block colors** | Most block types accept a trailing `{color="Color"}` attribute. |
| **Children** | Child blocks are indented one tab deeper than their parent. |

### 5.2 Color Values

The `Color` in `{color="Color"}` accepts these values (matching the Notion API):

**Text colors:** `default`, `gray`, `brown`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `red`

**Background colors:** `gray_background`, `brown_background`, `orange_background`, `yellow_background`, `green_background`, `blue_background`, `purple_background`, `pink_background`, `red_background`

### 5.3 Block Types — Standard Markdown

#### Paragraph (Text)

```
Rich text {color="Color"}
	Children (indented with tab)
```

Plain text paragraph. Color attribute is optional. Children are rare but supported (Notion paragraphs can have nested blocks).

#### Headings

```
# Rich text {color="Color"}
## Rich text {color="Color"}
### Rich text {color="Color"}
```

Headings 4, 5, and 6 are **not supported** in Notion. The deserializer should convert them to heading 3.

#### Bulleted List

```
- Rich text {color="Color"}
	Children (indented with tab)
```

Nesting creates sub-lists via tab indentation:

```
- Top level item
	- Nested item
		- Deeply nested
```

#### Numbered List

```
1. Rich text {color="Color"}
	Children
```

Same nesting rules as bulleted lists.

#### To-Do (Checkbox)

```
- [ ] Rich text {color="Color"}
	Children
- [x] Rich text {color="Color"}
	Children
```

`[ ]` = unchecked, `[x]` = checked.

#### Blockquote

```
> Rich text {color="Color"}
```

**Important difference from standard markdown:** To include multiple lines in a **single** blockquote, use `<br>` linebreaks within one `>` block. Do NOT use multiple `>` lines — in Notion-flavored Markdown, multiple `>` lines render as **separate** blockquote blocks (unlike standard markdown where they merge).

```
> Line 1<br>Line 2<br>Line 3 {color="Color"}
```

#### Divider

```
---
```

A horizontal rule / divider block.

#### Code Block

````
```language
Code content
```
````

The `language` corresponds to Notion's supported code languages (javascript, python, typescript, etc.).

#### Equation (Block-level)

```
$$ LaTeX expression $$
```

Block-level LaTeX equation (KaTeX-compatible).

#### Image

```
![Alt text](url)
```

Standard markdown image syntax. Maps to Notion's image block with an external URL.

### 5.4 Block Types — Toggle Blocks

#### Toggle

```
▶ Rich text {color="Color"}
	Child block 1
	Child block 2
```

The `▶` character (U+25B6 BLACK RIGHT-POINTING TRIANGLE) is the toggle prefix. Children **must** be tab-indented to be contained within the toggle. Without indentation, they render as sibling blocks, not toggle children.

#### Toggle Headings

```
▶# Rich text {color="Color"}
	Children

▶## Rich text {color="Color"}
	Children

▶### Rich text {color="Color"}
	Children
```

These map to Notion's `heading_1`, `heading_2`, `heading_3` blocks with `is_toggleable: true`. Same child indentation rules as regular toggles.

### 5.5 Block Types — XML/HTML Tags

These block types use XML-like tag syntax because they have no natural markdown equivalent.

#### Table

```html
<table fit-page-width?="true|false" header-row?="true|false" header-column?="true|false">
<colgroup>
<col color?="Color">
<col color?="Color" width?="number">
</colgroup>
<tr color?="Color">
<td>Cell content</td>
<td color?="Color">Cell content</td>
</tr>
<tr>
<td>Cell content</td>
<td>Cell content</td>
</tr>
</table>
```

**Table attributes** (all optional):
- `fit-page-width`: Whether the table fills the page width
- `header-row`: First row is a header
- `header-column`: First column is a header

**Column styling** via `<colgroup>`/`<col>` (optional):
- `color`: Column-wide color
- `width`: Column width (leave empty to auto-size)

**Color precedence** (highest to lowest):
1. Cell color (`<td color="red">`)
2. Row color (`<tr color="blue_background">`)
3. Column color (`<col color="gray">`)

**Cell content** uses Notion-flavored Markdown for formatting (e.g., `**bold**`), NOT HTML tags like `<strong>`.

#### Callout

```html
<callout icon?="emoji" color?="Color">Rich text content</callout>
```

Examples:
```html
<callout icon="💡" color="yellow_background">This is a tip</callout>
<callout icon="⚠️">Warning without explicit color</callout>
<callout>Callout without icon</callout>
```

Maps to Notion's callout block with `icon.emoji` and `color` properties.

#### Bookmark

```html
<bookmark url="https://example.com">Optional caption text</bookmark>
```

Maps to Notion's bookmark block with `url` and optional `caption`.

#### Embed

```html
<embed url="https://example.com">Optional caption</embed>
```

For embedded external content (iframes, etc.).

#### Image (XML variant)

```html
<image url="https://example.com/image.png">Optional caption</image>
```

Alternative to `![alt](url)` syntax, with caption support.

#### Video

```html
<video url="https://example.com/video.mp4">Optional caption</video>
```

#### Audio

```html
<audio url="https://example.com/audio.mp3">Optional caption</audio>
```

#### File

```html
<file url="https://example.com/document.pdf">Optional caption</file>
```

#### PDF

```html
<pdf url="https://example.com/document.pdf">Optional caption</pdf>
```

#### Child Page

```html
<page url="https://notion.so/Page-Title-abc123">Page Title</page>
```

Represents a `child_page` block — a page nested under the current page. The URL is the Notion page URL.

#### Child Database

```html
<database url="https://notion.so/db-id">Database Title</database>
```

Represents a `child_database` block. May contain `<data-source>` children describing the schema.

#### Data Source

```html
<data-source url="collection://f336d0bc-b841-465b-8045-024475c079dd">
... schema information ...
</data-source>
```

Found inside `<database>` tags. Describes the schema of a database view.

#### Synced Block

```html
<synced_block url="notion://synced_block/original_block_id">
	Child content
</synced_block>
```

For original synced blocks. Duplicate synced blocks reference the original:

```html
<synced_block synced_from="original_block_id"/>
```

#### Column List / Columns

```html
<column_list>
<column width_ratio="0.5">
Column 1 content in markdown
</column>
<column width_ratio="0.5">
Column 2 content in markdown
</column>
</column_list>
```

`width_ratio` is a number between 0 and 1, relative to the column list width. Must have at least 2 columns.

#### Table of Contents

```html
<table_of_contents color?="Color"/>
```

Self-closing tag. Maps to Notion's table_of_contents block.

#### Breadcrumb

```html
<breadcrumb/>
```

Self-closing tag. No content or attributes.

#### Link Preview

```html
<link_preview url="https://example.com"/>
```

#### Unknown Block

```html
<unknown url="https://notion.so/..." alt="Description"/>
```

Fallback for block types not yet supported in the API.

#### Empty Block

```html
<empty-block/>
```

Explicit empty paragraph. Must appear on its own line. Regular empty lines are ignored.

### 5.6 Inline Rich Text Formatting

These apply within any rich text content (paragraphs, headings, list items, etc.):

| Syntax | Notion annotation | Notes |
|--------|-------------------|-------|
| `**text**` | `bold: true` | |
| `*text*` or `_text_` | `italic: true` | |
| `~~text~~` | `strikethrough: true` | |
| `` `text` `` | `code: true` | |
| `__text__` | `underline: true` | Note: underline uses double underscores, NOT standard markdown emphasis |
| `[text](url)` | `text.link.url` | Inline link |
| `$expression$` | `equation.expression` | Inline LaTeX equation |

#### Inline Mentions

```html
<mention-page id="page-uuid">Page Title</mention-page>
<mention-database id="db-uuid">Database Title</mention-database>
<mention-user id="user-uuid">User Name</mention-user>
<mention-date start="2024-01-15" end?="2024-01-20">Display Text</mention-date>
```

#### Colored Inline Text

Rich text annotations include a `color` field. The markdown representation for inline colored text is TBD / may use a span-like syntax. For block-level colors, the `{color="Color"}` attribute applies to the entire block.

### 5.7 Formatting Combinations

Annotations can be combined:
- `***text***` → bold + italic
- `**~~text~~**` → bold + strikethrough
- `` **`text`** `` → bold + code

### 5.8 Rich Text Limits (Notion API)

These limits should be enforced when `enforceNotionLimits` is true:

| Limit | Value |
|-------|-------|
| Max characters per rich text element | 2,000 |
| Max rich text elements per block | 100 |
| Max blocks per append/create request | 100 |

When content exceeds these limits, the serializer should split it into multiple elements/blocks.

---

## 6. Notion API Block Type Mapping

Complete mapping from Notion API block types to their markdown representation:

| Notion Block Type | Markdown Syntax | Category |
|-------------------|-----------------|----------|
| `paragraph` | `Rich text {color="Color"}` | Standard |
| `heading_1` | `# Rich text {color="Color"}` | Standard |
| `heading_2` | `## Rich text {color="Color"}` | Standard |
| `heading_3` | `### Rich text {color="Color"}` | Standard |
| `heading_1` (toggleable) | `▶# Rich text {color="Color"}` | Toggle |
| `heading_2` (toggleable) | `▶## Rich text {color="Color"}` | Toggle |
| `heading_3` (toggleable) | `▶### Rich text {color="Color"}` | Toggle |
| `bulleted_list_item` | `- Rich text {color="Color"}` | Standard |
| `numbered_list_item` | `1. Rich text {color="Color"}` | Standard |
| `to_do` | `- [ ] / - [x] Rich text {color="Color"}` | Standard |
| `toggle` | `▶ Rich text {color="Color"}` | Toggle |
| `quote` | `> Rich text {color="Color"}` | Standard |
| `divider` | `---` | Standard |
| `code` | ` ```lang ... ``` ` | Standard |
| `equation` | `$$ expression $$` | Standard |
| `image` | `![alt](url)` or `<image>` | Standard/XML |
| `callout` | `<callout icon="" color="">` | XML |
| `bookmark` | `<bookmark url="">` | XML |
| `embed` | `<embed url="">` | XML |
| `video` | `<video url="">` | XML |
| `audio` | `<audio url="">` | XML |
| `file` | `<file url="">` | XML |
| `pdf` | `<pdf url="">` | XML |
| `table` | `<table>` with `<tr>`/`<td>` | XML |
| `column_list` | `<column_list>` with `<column>` | XML |
| `synced_block` | `<synced_block>` | XML |
| `child_page` | `<page url="">` | XML |
| `child_database` | `<database url="">` | XML |
| `table_of_contents` | `<table_of_contents/>` | XML |
| `breadcrumb` | `<breadcrumb/>` | XML |
| `link_preview` | `<link_preview url=""/>` | XML |
| `template` | (not commonly used, treat as unknown) | — |
| unsupported | `<unknown url="" alt=""/>` | XML |

---

## 7. Test Strategy

### 7.1 Test Corpus

Build a test corpus from real Notion pages fetched via the MCP server's `fetch` tool. This gives you ground-truth markdown output for known block structures. Aim for at least 20 diverse pages covering:

- Simple text with formatting
- Nested lists (3+ levels deep)
- Toggle blocks with children
- Callouts with icons and colors
- Tables with headers and colored cells
- Code blocks in multiple languages
- Equations (inline and block)
- Pages with embedded child pages/databases
- Column layouts
- Synced blocks
- Mixed content (all of the above on one page)

### 7.2 Round-Trip Tests

For each test case:
1. Start with known Notion block JSON
2. Serialize to markdown
3. Deserialize back to block JSON
4. Assert the resulting blocks are **functionally equivalent** to the input

"Functionally equivalent" means: same block types, same content, same nesting structure, same colors/annotations. It does NOT require identical object keys or metadata (like `id`, `created_time`, etc.).

### 7.3 Property-Based Tests

Use a property-based testing library (e.g., `fast-check`) to generate random valid block trees and verify round-trip invariants:
- `parse(serialize(blocks)).length === blocks.length`
- Block types preserved
- Rich text content preserved
- Nesting depth preserved
- Colors preserved

### 7.4 Edge Cases to Test

- Empty blocks / `<empty-block/>`
- Blocks with only whitespace
- Rich text exceeding 2000 character limit
- Deeply nested content (10+ levels)
- Tables with colored cells, rows, and columns simultaneously
- Toggle headings (distinguish from regular headings)
- Blockquote with `<br>` multiline content
- Backslash-escaped special characters
- Adjacent list types (bulleted immediately followed by numbered)
- Code blocks containing markdown-like syntax
- Inline equations inside bold/italic text
- Standard markdown input with no Notion extensions (graceful handling)

### 7.5 Snapshot Tests

For every block type, maintain a `__snapshots__/` directory with paired files:
- `{blocktype}.json` — the Notion API block JSON
- `{blocktype}.md` — the expected markdown output

---

## 8. Serializer Implementation Notes

### 8.1 Deterministic Output

The serializer **must** produce deterministic output for the same input. This is critical because Notion's `selection_with_ellipsis` editing pattern relies on string matching against serialized markdown. Specifically:

- Consistent attribute ordering in `{color="Color"}`
- Consistent whitespace (no trailing spaces, consistent newlines)
- Consistent escaping
- Sorted attributes in XML tags

### 8.2 Indentation

All children are indented with exactly one additional tab per nesting level. The serializer should:
1. Track current indentation depth
2. Prepend tabs to each line of a child block's output
3. Handle multi-line blocks (like code blocks) by indenting every line

### 8.3 Rich Text Serialization

Walk the `rich_text` array and emit inline markdown for each element:
1. Check `annotations` and wrap content in appropriate markers (`**`, `*`, `` ` ``, `~~`, `__`)
2. Handle nested annotations by combining markers: `***bold italic***`
3. For `mention` type elements, emit the appropriate `<mention-*>` tag
4. For `equation` type elements, emit `$expression$`
5. For text with links, emit `[content](url)`

### 8.4 Block-Level Color

Append ` {color="Color"}` after the block's main content line, but ONLY if the color is not `"default"`.

---

## 9. Deserializer Implementation Notes

### 9.1 Parsing Strategy

A line-by-line tokenizer is recommended over a full markdown AST parser because:
- Tab-based indentation is non-standard (most markdown parsers use spaces)
- The XML tags need custom handling
- Toggle prefix (`▶`) is unique to this spec
- Color attributes (`{color="..."}`) are non-standard

**Tokenizer output** should be a stream of typed tokens:
```typescript
type Token =
  | { type: 'heading'; level: 1|2|3; toggleable: boolean; content: string; color?: string }
  | { type: 'paragraph'; content: string; color?: string }
  | { type: 'bulleted_list'; content: string; color?: string }
  | { type: 'numbered_list'; content: string; color?: string }
  | { type: 'todo'; checked: boolean; content: string; color?: string }
  | { type: 'toggle'; content: string; color?: string }
  | { type: 'quote'; content: string; color?: string }
  | { type: 'divider' }
  | { type: 'code_start'; language: string }
  | { type: 'code_content'; content: string }
  | { type: 'code_end' }
  | { type: 'equation_start' }
  | { type: 'equation_content'; content: string }
  | { type: 'equation_end' }
  | { type: 'xml_open'; tag: string; attributes: Record<string, string> }
  | { type: 'xml_close'; tag: string }
  | { type: 'xml_self_closing'; tag: string; attributes: Record<string, string> }
  | { type: 'image'; alt: string; url: string }
  | { type: 'empty_block' }
  | { type: 'indent_increase' }  // Tab detected at start
  | { type: 'indent_decrease' }
```

### 9.2 Building the Block Tree

After tokenizing, build a tree based on indentation:
1. Maintain a stack of parent blocks
2. When indentation increases, the previous block becomes a parent
3. When indentation decreases, pop parents from the stack
4. XML tags that span multiple lines use open/close matching

### 9.3 Rich Text Parsing

Parse inline markdown within content strings:
1. Handle escape sequences first (`\*` → literal `*`)
2. Parse inline code (`` ` ``) — content inside is literal
3. Parse bold (`**`), italic (`*`/`_`), strikethrough (`~~`), underline (`__`)
4. Parse links (`[text](url)`)
5. Parse inline equations (`$expr$`)
6. Parse inline mentions (`<mention-page>` etc.)
7. Build `NotionRichText[]` array with appropriate annotations

### 9.4 Handling Standard Markdown Gracefully

When the input is standard markdown without any Notion extensions:
- It should still parse correctly into valid Notion blocks
- `H4`–`H6` → `heading_3`
- GFM tables → Notion table blocks (with `<table>` structure internally)
- Standard blockquotes (multiple `>` lines) → separate quote blocks per the spec
- HTML that doesn't match Notion XML tags → preserved as paragraph text or ignored

---

## 10. Out of Scope (v1)

These are explicitly deferred to future versions:

- **Database properties serialization** — the property system (JSON map with SQLite-style values, date/place expansion) is a separate concern from content markdown
- **Notion API interaction** — this package does NOT make API calls
- **File uploads** — image/file/video blocks with `file_upload` type (only external URLs)
- **Real-time collaboration** — no CRDT or conflict resolution
- **Selection matching** — the `selection_with_ellipsis` pattern is a consumer-side concern, not the serializer's job
- **Page-level metadata** — title, icon, cover image are outside content scope
- **Template blocks** — rarely used programmatically
- **Comments** — separate API concept from page content

---

## 11. Prior Art & References

### Existing Libraries (partial solutions)

| Library | Language | What it does | What it misses |
|---------|----------|--------------|----------------|
| [`@tryfabric/martian`](https://github.com/tryfabric/martian) | TypeScript | Standard markdown ↔ Notion blocks | Colors, toggles, callouts, XML tags, tab indentation |
| [`notionmd`](https://github.com/brittonhayes/notionmd) | Go | Standard markdown → Notion blocks | Same gaps as martian |
| [`@suekou/mcp-notion-server`](https://github.com/suekou/mcp-notion-server) | TypeScript | MCP server with experimental markdown | Coupled to MCP protocol, not extractable |
| [`markdown-to-notion-blocks`](https://github.com/roelmagdaleno/markdown-to-notion-blocks) | PHP | Standard markdown → Notion blocks | PHP-only, standard markdown only |

### Specification Sources

1. **Notion MCP tool descriptions** — the `create-pages` tool embeds the full spec, referenced as `notion://docs/enhanced-markdown-spec`
2. **Smithery server listing** — [smithery.ai/server/notion](https://smithery.ai/server/notion) exposes the tool descriptions publicly
3. **Notion API Block Reference** — [developers.notion.com/reference/block](https://developers.notion.com/reference/block) — authoritative list of all block types and their JSON structure
4. **Notion MCP blog post** — [notion.com/blog/building-the-notion-mcp-server](https://www.notion.com/blog/building-the-notion-mcp-server) — explains the design philosophy
5. **Notion API Rich Text Reference** — [developers.notion.com/reference/rich-text](https://developers.notion.com/reference/rich-text) — rich text structure and annotation types

### Key Design Decisions from Notion

- Markdown was rejected in 2022 because CommonMark couldn't express colors, databases, toggles
- Revived in 2025 with XML-like extensions for feature parity
- Tab indentation chosen (over spaces) for unambiguous nesting
- XML tags used for blocks that have no markdown precedent
- Properties kept separate from content (JSON, not markdown)
- The format is designed for token efficiency when used by LLMs

---

## 12. Development & Build

### Recommended Stack

- **Language:** TypeScript (strict mode)
- **Build:** `tsup` or `unbuild` for ESM + CJS dual output
- **Test:** `vitest` with snapshot testing
- **Lint:** `biome` or `eslint` + `prettier`
- **Package manager:** `pnpm`

### Package Naming

Suggested: `notion-md-serde`, `notion-flavored-markdown`, or `@notion-tools/markdown`

### Entry Points

```json
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./serialize": { ... },
    "./deserialize": { ... }
  }
}
```

---

## 13. Building the Test Corpus

To get real Notion-flavored Markdown examples, use the Notion MCP server's `fetch` tool through any MCP client (Claude, Cursor, etc.) to read pages from a test workspace. Create pages in Notion with every block type, then fetch them to see the exact markdown output. This is the most reliable way to validate the spec since Notion hasn't published it as a standalone document.

Example workflow:
1. Create a Notion page with diverse content
2. Connect the Notion MCP server to Claude or Cursor
3. Ask it to fetch the page
4. The response will be in Notion-flavored Markdown
5. Save the markdown and the corresponding block JSON (via REST API) as paired test fixtures
