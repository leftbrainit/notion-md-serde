## ADDED Requirements

### Requirement: Line-level tokenizer

The deserializer SHALL use a line-level tokenizer that produces typed tokens for: headings (level, toggleable, content, color), paragraph, bulleted_list, numbered_list, todo (checked, content, color), toggle, quote, divider, code (start/content/end with language), equation (start/content/end), XML (open/close/self-closing with tag and attributes), image (alt, url), empty_block, and indent changes (increase/decrease). The tokenizer SHALL recognize tab-based indentation, the toggle prefix `▶`, color attributes `{color="..."}`, and XML-style tags.

#### Scenario: Tab as indent token

- **WHEN** a line starts with more tabs than the previous line
- **THEN** the tokenizer SHALL emit indent_increase (or equivalent) so the parser can build the block tree

#### Scenario: Toggle prefix recognized

- **WHEN** a line starts with `▶` (optionally followed by `#`, `##`, `###`)
- **THEN** the tokenizer SHALL emit a heading or toggle token with a toggleable flag or type

#### Scenario: Color attribute parsed

- **WHEN** a content line ends with ` {color="Color"}`
- **THEN** the tokenizer SHALL include the color value in the token and strip it from the content string

### Requirement: Block tree from indentation

The deserializer SHALL build a block tree from the token stream using indentation: when indentation increases, the previous block becomes the parent of subsequent blocks until indentation decreases; when indentation decreases, the parser SHALL pop parent context. Nested structures (e.g. toggle with children, list with sub-items) SHALL be represented as parent-child block relationships.

#### Scenario: Toggle with children

- **WHEN** a toggle token is followed by tokens at greater indent
- **THEN** those tokens SHALL produce blocks that are children of the toggle block

#### Scenario: List nesting

- **WHEN** bulleted or numbered list items appear at increasing indent levels
- **THEN** deeper items SHALL be children of the shallower item that immediately precedes them

### Requirement: XML tag spanning and nesting

For XML-style blocks (table, callout, column_list, synced_block, etc.), the tokenizer/parser SHALL correctly match open and close tags and handle nested tags (e.g. `<table><tr><td>...</td></tr></table>`). Multi-line content inside a tag SHALL be captured until the closing tag. Self-closing tags SHALL be emitted as single tokens with attributes.

#### Scenario: Table parsed as one block

- **WHEN** markdown contains a full `<table>...</table>` with rows and cells
- **THEN** the parser SHALL produce one table block with the correct structure (header row/column if specified, cell content, column/row/cell colors)

#### Scenario: Self-closing tag

- **WHEN** markdown contains `<table_of_contents/>` or `<breadcrumb/>`
- **THEN** the parser SHALL produce the corresponding block with no children and no content

### Requirement: AST or intermediate representation to Notion blocks

The deserializer SHALL map parsed tokens (or an intermediate AST) to Notion API block structures. Each block SHALL have the correct `type` and type-specific properties (e.g. `rich_text`, `checked`, `url`, `language`). Rich text content SHALL be converted via the rich-text capability (inline markdown to NotionRichText array).

#### Scenario: Block type and properties

- **WHEN** a heading token is emitted
- **THEN** the resulting block SHALL have `type: "heading_1"` (or 2/3), `heading_1: { rich_text: [...] }`, and optionally `is_toggleable: true`

#### Scenario: Rich text in blocks

- **WHEN** a token contains content that includes bold, links, or mentions
- **THEN** the block's rich_text array SHALL be populated by parsing that content with the rich-text deserializer

### Requirement: Strict vs lenient mode

When `DeserializeOptions.strict` is true, the deserializer SHALL fail or signal error on unknown syntax (e.g. unsupported XML tag, invalid attribute). When `strict` is false, unknown syntax SHALL be passed through as paragraph content or otherwise handled without failing.

#### Scenario: Strict mode unknown tag

- **WHEN** `strict: true` and input contains an unrecognized XML tag
- **THEN** the deserializer SHALL treat it as an error or undefined behavior as specified

#### Scenario: Lenient mode fallback

- **WHEN** `strict: false` and input contains syntax that cannot be mapped to a block type
- **THEN** the deserializer SHALL produce a paragraph (or equivalent) so that valid Notion blocks are still returned

### Requirement: Standard markdown compatibility

When input is standard markdown without Notion extensions, the deserializer SHALL still produce valid Notion blocks: headings 4–6 SHALL map to heading_3; GFM tables MAY be converted to Notion table blocks; multiple `>` blockquote lines SHALL produce separate quote blocks per the spec; HTML that does not match Notion XML tags SHALL be preserved as paragraph text or ignored as specified.

#### Scenario: H4–H6 to heading_3

- **WHEN** input contains `####`, `#####`, or `######`
- **THEN** the deserializer SHALL emit `heading_3` blocks

#### Scenario: Multiple blockquotes

- **WHEN** input has two lines each starting with `>`
- **THEN** the deserializer SHALL emit two quote blocks, not one merged block

### Requirement: Notion limits when enforced

When `DeserializeOptions.enforceNotionLimits` is true, the deserializer SHALL split rich text so that no single rich text element exceeds 2000 characters, and SHALL respect per-block rich text element limits (e.g. 100) by splitting into multiple blocks or elements as needed.

#### Scenario: Long content split

- **WHEN** a paragraph's content would produce one rich text element over 2000 characters and `enforceNotionLimits` is true
- **THEN** the deserializer SHALL split into multiple rich text elements (or multiple blocks) so each stays within the limit
