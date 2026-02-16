## ADDED Requirements

### Requirement: Core serialize and deserialize functions

The package SHALL export `notionBlocksToMarkdown(blocks, options?)` and `markdownToNotionBlocks(markdown, options?)` as the primary conversion API. Serialize SHALL accept an array of Notion API–compatible blocks and return a single Notion-flavored Markdown string. Deserialize SHALL accept a markdown string and return an array of Notion API–compatible blocks.

#### Scenario: Serialize blocks to markdown

- **WHEN** caller invokes `notionBlocksToMarkdown(blocks)` with valid Notion blocks
- **THEN** the function returns a string in Notion-flavored Markdown with correct syntax and tab-based indentation for children

#### Scenario: Deserialize markdown to blocks

- **WHEN** caller invokes `markdownToNotionBlocks(markdown)` with valid Notion-flavored Markdown
- **THEN** the function returns an array of blocks that are functionally equivalent to what would serialize to that markdown

#### Scenario: Round-trip fidelity

- **WHEN** caller serializes blocks to markdown then deserializes back to blocks
- **THEN** the resulting blocks SHALL be functionally equivalent to the input (same types, content, nesting, colors, annotations)

### Requirement: Rich text conversion API

The package SHALL export `richTextToInlineMarkdown(richText)` and `inlineMarkdownToRichText(markdown)` for converting between Notion rich text arrays and inline markdown. These SHALL support annotations, links, equations, and mentions as defined in the Notion-flavored Markdown spec.

#### Scenario: Rich text to inline markdown

- **WHEN** caller invokes `richTextToInlineMarkdown(richText)` with a Notion rich text array
- **THEN** the function returns a string with correct inline markdown (bold, italic, links, mentions, etc.)

#### Scenario: Inline markdown to rich text

- **WHEN** caller invokes `inlineMarkdownToRichText(markdown)` with a string containing inline markdown
- **THEN** the function returns a Notion rich text array with correct annotations and mention/equation structures

### Requirement: Exported types

The package SHALL export TypeScript interfaces compatible with the Notion API for blocks and rich text: `NotionBlock`, `NotionRichText`, `NotionAnnotations`, `NotionColor`, and option types `SerializeOptions` and `DeserializeOptions`. The package SHALL NOT depend on `@notionhq/client` at runtime.

#### Scenario: Types are usable without Notion SDK

- **WHEN** a consumer imports types from the package
- **THEN** they can type block and rich text structures for use with this library or with Notion API responses without installing the Notion client

### Requirement: Serialize options

The package SHALL support optional `SerializeOptions`: `unknownBlockBehavior` (`omit` | `comment` | `placeholder`) for block types not in the spec, and `includeBlockIds` (boolean) to include Notion block IDs as HTML comments.

#### Scenario: Unknown block behavior

- **WHEN** serializing blocks that include an unsupported block type and `unknownBlockBehavior` is set
- **THEN** the serializer SHALL omit, emit a comment, or emit a placeholder according to the option

#### Scenario: Optional block IDs in output

- **WHEN** `includeBlockIds` is true
- **THEN** serialized markdown MAY include block IDs as HTML comments in a deterministic, documented format

### Requirement: Deserialize options

The package SHALL support optional `DeserializeOptions`: `strict` (boolean) to fail on unknown syntax vs pass through as paragraphs, and `enforceNotionLimits` (boolean) to auto-split rich text exceeding 2000 characters per element.

#### Scenario: Strict vs lenient parsing

- **WHEN** deserializing with `strict: true` and input contains unknown syntax
- **THEN** the parser SHALL treat it as an error or undefined behavior as specified; with `strict: false`, unknown syntax SHALL be passed through as paragraph content

#### Scenario: Notion limits enforcement

- **WHEN** `enforceNotionLimits: true` and content would produce a rich text element over 2000 characters
- **THEN** the deserializer SHALL split it into multiple rich text elements so each stays within the limit
