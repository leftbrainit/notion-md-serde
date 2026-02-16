## ADDED Requirements

### Requirement: Indentation and nesting

Notion-flavored Markdown SHALL use tab characters only for block nesting. Spaces SHALL NOT be valid for nesting. One indent level SHALL equal one tab. Child blocks SHALL be indented one tab deeper than their parent.

#### Scenario: Tab-only indentation

- **WHEN** markdown contains lines indented with spaces to indicate nesting
- **THEN** the deserializer SHALL NOT treat them as children; only tab-indented lines SHALL form the block tree

#### Scenario: Child depth

- **WHEN** a block has children, each child line SHALL start with one more tab than the parent line
- **THEN** serializer SHALL emit exactly one tab per nesting level; deserializer SHALL build parent-child relationships from tab depth

### Requirement: Escaping

Backslash escapes SHALL be supported: `\*` SHALL render as literal `*` (not bold delimiter). The serializer SHALL escape special characters where needed for round-trip; the deserializer SHALL interpret backslash escapes before parsing inline formatting.

#### Scenario: Literal asterisk

- **WHEN** markdown contains `\*` in rich text content
- **THEN** it SHALL be interpreted as a literal asterisk, not as the start or end of italic/bold

### Requirement: Empty lines and empty blocks

Empty lines in markdown SHALL be ignored for block structure (Notion handles spacing). An explicit empty paragraph block SHALL be represented by `<empty-block/>` on its own line.

#### Scenario: Empty block tag

- **WHEN** deserializer encounters a line containing only `<empty-block/>`
- **THEN** it SHALL emit an explicit empty paragraph block

#### Scenario: Ignored blank lines

- **WHEN** markdown contains blank lines between blocks
- **THEN** they SHALL NOT create extra blocks; block boundaries SHALL be determined by syntax and indentation

### Requirement: Block-level color attribute

Most block types SHALL support an optional trailing `{color="Color"}` attribute. Color SHALL be one of the Notion API values: text colors (`default`, `gray`, `brown`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `red`) and background colors (`gray_background` through `red_background`). Serializer SHALL omit the attribute when color is `default`.

#### Scenario: Color on block

- **WHEN** a block has a non-default color
- **THEN** serializer SHALL append ` {color="Color"}` after the block content line; deserializer SHALL set the block color from the attribute

#### Scenario: Default color omitted

- **WHEN** a block has color `default` or no color
- **THEN** serializer SHALL NOT emit `{color="..."}` for that block

### Requirement: Standard markdown block types

The format SHALL support paragraph, headings 1–3, bulleted list, numbered list, to-do (`- [ ]` / `- [x]`), blockquote, divider (`---`), fenced code block with language, block equation (`$$ ... $$`), and image `![alt](url)`. Headings 4–6 in input SHALL be normalized to heading 3 by the deserializer.

#### Scenario: Headings 1–3

- **WHEN** markdown contains `#`, `##`, or `###` followed by rich text
- **THEN** deserializer SHALL produce `heading_1`, `heading_2`, or `heading_3` blocks respectively

#### Scenario: H4–H6 normalized

- **WHEN** markdown contains `####`, `#####`, or `######`
- **THEN** deserializer SHALL produce `heading_3` blocks

#### Scenario: To-do syntax

- **WHEN** markdown contains `- [ ]` or `- [x]` followed by content
- **THEN** deserializer SHALL produce `to_do` blocks with `checked` true or false accordingly

### Requirement: Toggle and toggle heading syntax

Toggle blocks SHALL use the prefix `▶` (U+25B6). Toggle headings SHALL use `▶#`, `▶##`, `▶###` followed by rich text. Children of toggles SHALL be tab-indented under the toggle line; otherwise they SHALL be siblings.

#### Scenario: Toggle children

- **WHEN** lines immediately after a `▶` or `▶#` line are indented with one more tab than the toggle line
- **THEN** those lines SHALL be children of the toggle; lines at the same or lesser indent SHALL be siblings

#### Scenario: Toggle heading level

- **WHEN** markdown contains `▶#`, `▶##`, or `▶###` with content
- **THEN** deserializer SHALL produce `heading_1`, `heading_2`, or `heading_3` with `is_toggleable: true`

### Requirement: Blockquote multiline rule

Multiple consecutive `>` lines in Notion-flavored Markdown SHALL represent separate blockquote blocks (not one merged block). A single blockquote block with multiple lines SHALL use `<br>` within one `>` block.

#### Scenario: Multiple blockquote lines

- **WHEN** markdown has two separate lines each starting with `>`
- **THEN** deserializer SHALL produce two distinct quote blocks

#### Scenario: Single blockquote with line breaks

- **WHEN** markdown has one `>` block containing `<br>` for line breaks
- **THEN** deserializer SHALL produce one quote block with rich text containing the line breaks

### Requirement: XML-style block types

The format SHALL support XML-like tags for: table (with `<table>`, `<tr>`, `<td>`, `<colgroup>`, `<col>`), callout (`<callout icon="" color="">`), bookmark (`<bookmark url="">`), embed (`<embed url="">`), image (`<image url="">`), video, audio, file, pdf (`<video>`, `<audio>`, `<file>`, `<pdf>`), child page (`<page url="">`), child database (`<database url="">`), data-source (`<data-source>`), synced_block (with `url` or `synced_from`), column_list/column (`<column_list>`, `<column width_ratio="">`), table_of_contents (`<table_of_contents/>`), breadcrumb (`<breadcrumb/>`), link_preview (`<link_preview url="">`), unknown (`<unknown url="" alt="">`), and empty-block (`<empty-block/>`). Table SHALL support optional attributes fit-page-width, header-row, header-column; column/cell/row colors SHALL follow specified precedence (cell > row > column).

#### Scenario: Callout with icon and color

- **WHEN** markdown contains `<callout icon="💡" color="yellow_background">content</callout>`
- **THEN** deserializer SHALL produce a callout block with the given icon and color

#### Scenario: Table structure

- **WHEN** markdown contains a well-formed `<table>` with `<tr>` and `<td>` and optional `<colgroup>`/`<col>`
- **THEN** deserializer SHALL produce a Notion table block with rows, cells, and column/row/cell colors per spec precedence

#### Scenario: Self-closing tags

- **WHEN** markdown contains `<table_of_contents/>` or `<breadcrumb/>`
- **THEN** deserializer SHALL produce the corresponding block with no children

### Requirement: Inline formatting syntax

Inline rich text SHALL follow: `**text**` (bold), `*text*` or `_text_` (italic), `~~text~~` (strikethrough), `` `text` `` (code), `__text__` (underline), `[text](url)` (link), `$expression$` (inline equation). Inline mentions SHALL use `<mention-page id="">`, `<mention-database id="">`, `<mention-user id="">`, `<mention-date start="" end="">`. Annotations MAY be combined (e.g. bold+italic). Underline SHALL use double underscores to avoid conflict with emphasis.

#### Scenario: Combined annotations

- **WHEN** markdown contains `***text***` or `**~~text~~**`
- **THEN** deserializer SHALL produce rich text with the corresponding combination of annotations

#### Scenario: Inline mention tags

- **WHEN** markdown contains `<mention-page id="uuid">Title</mention-page>` (or database, user, date variants)
- **THEN** deserializer SHALL produce a rich text element with type `mention` and the appropriate subtype and attributes

### Requirement: Rich text limits (Notion API)

When the implementation enforces Notion limits, it SHALL respect: max 2000 characters per rich text element, max 100 rich text elements per block, and max 100 blocks per request where applicable. Serializer/deserializer SHALL split content when `enforceNotionLimits` (or equivalent) is true.

#### Scenario: Per-element character limit

- **WHEN** content would produce a single rich text element over 2000 characters and limits are enforced
- **THEN** the implementation SHALL split it into multiple elements each within the limit
