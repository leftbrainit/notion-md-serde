# notion-md-serde

Bidirectional conversion between **Notion API block JSON** and **Markdown**. Use it to export pages to Markdown, import Markdown into Notion, sync content, or build tooling on top of the Notion API—without depending on `@notionhq/client`.

## Why this library?

The [Notion API](https://developers.notion.com/) represents page content as **block objects** (paragraphs, headings, lists, etc.). That format is great for the API but not ideal for:

- **Portability** — Markdown is universal and works in any editor or static site.
- **Version control** — Diffs and merges are easier with plain text.
- **Offline editing** — Edit Markdown locally, then push back as blocks.
- **Migration & backup** — Store or transfer content in a human-readable format.

**notion-md-serde** gives you:

- **Serialize**: Notion blocks → Markdown (for export, backup, or static site generation).
- **Deserialize**: Markdown → Notion blocks (for import or syncing into Notion via the API).
- **Rich text**: Notion rich text ↔ inline Markdown (`**bold**`, `*italic*`, `` `code` ``, etc.).

Types follow the Notion API shape, so you can plug the output directly into `blocks.children.append` or similar endpoints. There is no runtime dependency on `@notionhq/client`.

---

## Install

```bash
pnpm add notion-md-serde
# or
npm install notion-md-serde
# or
yarn add notion-md-serde
```

**Requirements:** Node.js ≥ 18. ESM and CommonJS builds are provided.

---

## Quick start

### Notion blocks → Markdown

```ts
import { notionBlocksToMarkdown } from "notion-md-serde";

const blocks = [
  {
    type: "heading_1",
    heading_1: {
      rich_text: [{ type: "text", text: { content: "My Page" }, plain_text: "My Page" }],
    },
  },
  {
    type: "paragraph",
    paragraph: {
      rich_text: [
        { type: "text", text: { content: "Hello " }, plain_text: "Hello " },
        {
          type: "text",
          text: { content: "world" },
          plain_text: "world",
          annotations: { bold: true, italic: false, strikethrough: false, underline: false, code: false, color: "default" },
        },
      ],
    },
  },
  { type: "divider", divider: {} },
];

const markdown = notionBlocksToMarkdown(blocks);
// "# My Page\n\nHello **world**\n\n---"
```

### Markdown → Notion blocks

```ts
import { markdownToNotionBlocks } from "notion-md-serde";

const markdown = `
# Title

A paragraph with **bold** and *italic*.

- Item one
- Item two

---
`;

const blocks = markdownToNotionBlocks(markdown);
// Use blocks with the Notion API, e.g. blocks.children.append(...)
```

### Rich text only (inline formatting)

Useful when you only have a rich text array (e.g. from a block’s `rich_text` field) or need to build one from a string.

```ts
import { richTextToInlineMarkdown, inlineMarkdownToRichText } from "notion-md-serde";

// Notion rich text → inline Markdown
const richText = [
  { type: "text", text: { content: "Hello" }, plain_text: "Hello" },
  {
    type: "text",
    text: { content: " bold" },
    plain_text: " bold",
    annotations: { bold: true, italic: false, strikethrough: false, underline: false, code: false, color: "default" },
  },
];
richTextToInlineMarkdown(richText); // "Hello** bold**"

// Inline Markdown → Notion rich text
const segments = inlineMarkdownToRichText("Some **bold** and `code` here");
// Array of NotionRichText suitable for block.paragraph.rich_text, etc.
```

---

## Options

### Serialize (blocks → Markdown)

```ts
import { notionBlocksToMarkdown } from "notion-md-serde";
import type { SerializeOptions } from "notion-md-serde";

const options: SerializeOptions = {
  unknownBlockBehavior: "placeholder", // or "omit" | "comment"
  includeBlockIds: false,              // set true to emit <!-- block-id: ... -->
};
const md = notionBlocksToMarkdown(blocks, options);
```

| Option | Default | Description |
|--------|---------|-------------|
| `unknownBlockBehavior` | `"placeholder"` | How to handle block types with no Markdown mapping: `"omit"`, `"comment"`, or `"placeholder"`. |
| `includeBlockIds` | `false` | When true, inserts HTML comments with Notion block IDs for round-trip fidelity. |

### Deserialize (Markdown → blocks)

```ts
import { markdownToNotionBlocks } from "notion-md-serde";
import type { DeserializeOptions } from "notion-md-serde";

const options: DeserializeOptions = {
  strict: false,           // true = fail on unknown syntax; false = pass through as paragraphs
  enforceNotionLimits: false, // true = split rich text > 2000 chars per element
};
const blocks = markdownToNotionBlocks(markdown, options);
```

| Option | Default | Description |
|--------|---------|-------------|
| `strict` | `false` | If true, parsing errors on unsupported syntax; if false, unknown constructs become paragraphs. |
| `enforceNotionLimits` | `false` | If true, splits long rich text so each segment stays within Notion’s 2000-character limit. |

---

## Supported block types

Serialization and deserialization support common Notion block types, including:

- **Text:** paragraph, heading_1/2/3, quote, code, callout  
- **Lists:** bulleted_list_item, numbered_list_item, to_do  
- **Media:** image, embed, bookmark, link_preview, video, audio, file, pdf  
- **Structure:** divider, toggle, table, column_list, synced_block  
- **Notion-specific:** child_page, child_database, table_of_contents, breadcrumb  
- **Other:** equation  

Unknown block types are handled according to `unknownBlockBehavior` when serializing.

---

## TypeScript

The package ships with TypeScript types. Use the exported types for blocks and options:

```ts
import type { NotionBlock, NotionRichText, SerializeOptions, DeserializeOptions } from "notion-md-serde";
```

---

## Deno

After building the project, you can run the ESM build under Deno:

```ts
import {
  notionBlocksToMarkdown,
  markdownToNotionBlocks,
  richTextToInlineMarkdown,
  inlineMarkdownToRichText,
} from "https://esm.sh/notion-md-serde";
```

---

## Example: Supabase Edge Function

An example [Supabase Edge Function](https://supabase.com/docs/guides/functions) is included that accepts an array of Notion blocks (with optional nested `children` at any depth) and returns a JSON object with a `markdown` key:

- **Path:** `supabase/functions/notion-blocks-to-markdown/`
- **Request:** `POST` with JSON body: `{ "blocks": [ ... ] }` or a raw array of blocks.
- **Response:** `{ "markdown": "# Title\n\n..." }`

See `supabase/functions/notion-blocks-to-markdown/README.md` for usage and deploy steps.

---

## Development

```bash
pnpm install
pnpm build
pnpm test        # vitest
pnpm test:deno   # build + deno test
pnpm lint
pnpm format
```

## License

See [LICENSE](./LICENSE) in the repo.
