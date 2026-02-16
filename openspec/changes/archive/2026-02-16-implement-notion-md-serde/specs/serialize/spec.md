## ADDED Requirements

### Requirement: Block visitor pipeline

The serializer SHALL use a block visitor pattern: each Notion block type SHALL have a dedicated visitor that converts the block to markdown (including Notion extensions) and recursively processes children with increased tab indentation.

#### Scenario: One visitor per block type

- **WHEN** a supported block type is serialized
- **THEN** a single visitor for that type SHALL produce the correct markdown syntax for that type

#### Scenario: Children indented

- **WHEN** a block has children
- **THEN** each line of each child block's output SHALL be prefixed with one additional tab per nesting level relative to the parent

### Requirement: Deterministic output

The serializer SHALL produce deterministic output for the same input: consistent attribute ordering in `{color="Color"}`, consistent whitespace (no trailing spaces, consistent newlines), consistent escaping, and sorted or fixed order for XML tag attributes.

#### Scenario: Same input same output

- **WHEN** the same block array is serialized twice
- **THEN** the two markdown strings SHALL be identical

#### Scenario: No trailing whitespace

- **WHEN** serializing any block
- **THEN** lines SHALL NOT end with trailing spaces unless required by syntax

### Requirement: Rich text to inline markdown in blocks

For each block that contains rich text, the serializer SHALL convert the block's `rich_text` array to inline markdown via the rich-text capability: annotations (bold, italic, strikethrough, underline, code), links, equations, mentions, and combined annotations. Block-level color SHALL be emitted as ` {color="Color"}` after the content line only when color is not `default`.

#### Scenario: Annotations emitted

- **WHEN** a block's rich text has bold, italic, or other annotations
- **THEN** the emitted markdown SHALL wrap content in the correct delimiters (`**`, `*`, `~~`, `` ` ``, `__`)

#### Scenario: Block color only when non-default

- **WHEN** a block has a color field set to a value other than `default`
- **THEN** the serializer SHALL append ` {color="Color"}` after the block's main content line; when color is `default`, it SHALL NOT append the attribute

### Requirement: Multi-line block indentation

For blocks whose markdown representation spans multiple lines (e.g. fenced code blocks), the serializer SHALL indent every line of the block by the current nesting depth (tabs). Child blocks of such a block SHALL use one more tab than the block's own lines.

#### Scenario: Code block indentation

- **WHEN** a code block has children or is nested inside a toggle
- **THEN** the opening fence, code lines, and closing fence SHALL all be prefixed with the same tab sequence; any children SHALL have one more tab

### Requirement: Unknown block behavior

When a block type is not in the Notion-flavored Markdown spec, the serializer SHALL behave according to `SerializeOptions.unknownBlockBehavior`: omit the block, emit an HTML comment describing it, or emit a placeholder (e.g. `<unknown .../>`). Behavior SHALL be consistent and documented.

#### Scenario: Omit unknown blocks

- **WHEN** `unknownBlockBehavior` is `omit` and a block type is unsupported
- **THEN** the serializer SHALL not emit any markdown for that block (children may still be emitted at same indent if applicable)

#### Scenario: Placeholder for unknown

- **WHEN** `unknownBlockBehavior` is `placeholder` and a block type is unsupported
- **THEN** the serializer SHALL emit a deterministic placeholder tag (e.g. `<unknown>`) so round-trip can preserve presence of the block

### Requirement: Optional block IDs in output

When `SerializeOptions.includeBlockIds` is true, the serializer MAY include Notion block IDs in the output as HTML comments in a documented, deterministic format. When false, block IDs SHALL NOT be included.

#### Scenario: Block IDs when requested

- **WHEN** `includeBlockIds` is true and a block has an id
- **THEN** the output MAY include that id in a comment in a way that does not break parsing

#### Scenario: No block IDs by default

- **WHEN** `includeBlockIds` is false or omitted
- **THEN** serialized markdown SHALL NOT contain block ID comments

### Requirement: All spec block types supported

The serializer SHALL support every block type listed in the Notion API block type mapping (paragraph, heading_1/2/3 including toggleable, bulleted_list_item, numbered_list_item, to_do, toggle, quote, divider, code, equation, image, callout, bookmark, embed, video, audio, file, pdf, table, column_list, synced_block, child_page, child_database, table_of_contents, breadcrumb, link_preview) with the correct markdown or XML syntax per the markdown-syntax spec.

#### Scenario: Toggle vs heading

- **WHEN** a heading block has `is_toggleable: true`
- **THEN** the serializer SHALL emit `▶#`, `▶##`, or `▶###` instead of `#`, `##`, `###`

#### Scenario: Table with colgroup and colors

- **WHEN** a table block has column widths or column colors
- **THEN** the serializer SHALL emit `<table>`, `<colgroup>`, `<col>`, `<tr>`, `<td>` with the correct attributes and color precedence
