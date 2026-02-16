## ADDED Requirements

### Requirement: Rich text to inline markdown

The library SHALL convert a Notion rich text array to inline markdown by: emitting annotation delimiters (`**`, `*`, `_`, `~~`, `` ` ``, `__`) from `annotations`; emitting `[text](url)` for text with link; emitting `$expression$` for equation type; emitting the appropriate `<mention-*>` tag for mention type (page, database, user, date with id/start/end). Order of segments SHALL preserve the input array order. Combined annotations SHALL be emitted with combined delimiters (e.g. `***` for bold+italic).

#### Scenario: Bold and italic

- **WHEN** rich text contains an element with `annotations: { bold: true }` or `{ italic: true }`
- **THEN** output SHALL wrap content in `**` or `*` (or `_`) respectively

#### Scenario: Link

- **WHEN** rich text contains an element with `text.link.url`
- **THEN** output SHALL be `[plain_text](url)`

#### Scenario: Mention tags

- **WHEN** rich text contains a mention element (page, database, user, or date)
- **THEN** output SHALL be the corresponding `<mention-page id="">`, `<mention-database id="">`, `<mention-user id="">`, or `<mention-date start="" end="">` with correct attributes and body text

### Requirement: Inline markdown to rich text

The library SHALL parse inline markdown into a Notion rich text array by: resolving escape sequences first (`\*` → literal); parsing inline code (backticks) with literal content; parsing bold (`**`), italic (`*`/`_`), strikethrough (`~~`), underline (`__`); parsing links `[text](url)`; parsing inline equations `$expr$`; parsing mention tags. Resulting elements SHALL have the correct `type` (`text`, `mention`, `equation`) and `annotations` object. Underline SHALL use double underscores to avoid conflict with emphasis.

#### Scenario: Escapes first

- **WHEN** input contains `\*`
- **THEN** it SHALL be consumed as escape and the next character SHALL be literal in the text content, not as delimiter

#### Scenario: Inline code literal

- **WHEN** input contains `` `code` ``
- **THEN** the segment SHALL be one rich text element with `code: true` and no further parsing inside the backticks

#### Scenario: Annotation combinations

- **WHEN** input contains `***bold italic***` or `**~~bold strike~~**`
- **THEN** the output SHALL have one (or more) rich text elements with the corresponding combination of annotation flags set

### Requirement: Color in rich text

Rich text elements MAY include a `color` field (Notion API color values). The serializer SHALL emit inline color in a defined way (e.g. span-like syntax if specified); the deserializer SHALL parse it and set `annotations.color` or the element's color field. Block-level color remains separate (`{color="..."}` on the block).

#### Scenario: Color round-trip

- **WHEN** rich text has a non-default color and the spec defines an inline color syntax
- **THEN** serialize then deserialize SHALL preserve the color value

### Requirement: Equation handling

Equation elements SHALL be serialized as `$expression$` (inline) or block equations as `$$ expression $$`. The deserializer SHALL parse `$...$` as inline equation and `$$...$$` as block equation. Expression content SHALL be preserved exactly (no interpolation of markdown inside the expression).

#### Scenario: Inline equation

- **WHEN** rich text contains an element with `type: "equation"` and `equation.expression`
- **THEN** serializer SHALL emit `$expression$`; deserializer SHALL parse `$...$` and produce an equation rich text element

#### Scenario: No parsing inside equation

- **WHEN** content between `$` delimiters looks like markdown (e.g. `$a**b**c$`)
- **THEN** the expression SHALL be stored as-is; internal `**` SHALL NOT be treated as bold

### Requirement: Splitting when over API limit

When the caller requests enforcement of Notion limits (e.g. via options on the public API), the rich text serializer/deserializer SHALL split content so that no single rich text element exceeds 2000 characters. Split points SHALL preserve annotation boundaries where possible (e.g. not mid-word in a bold span unless necessary).

#### Scenario: Split long text

- **WHEN** serializing or deserializing would produce a single rich text element longer than 2000 characters and limits are enforced
- **THEN** the implementation SHALL split into multiple elements each under 2000 characters, preserving semantics (e.g. same annotations on continuation)

### Requirement: Plain text fallback

For rich text elements that have `plain_text` (or equivalent) but no structured content, the serializer SHALL emit the plain text with annotations applied. For inline markdown that does not match any special syntax, the deserializer SHALL produce a single text element with no annotations (or default annotations).

#### Scenario: Plain text with annotations

- **WHEN** a rich text element has only `plain_text` and `annotations: { bold: true }`
- **THEN** serializer SHALL emit `**plain_text**`

#### Scenario: Unformatted span

- **WHEN** a segment of inline markdown has no delimiters
- **THEN** deserializer SHALL produce a text element with that content and default (false) annotations
