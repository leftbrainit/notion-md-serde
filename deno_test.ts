/**
 * Deno compatibility test: imports built ESM and runs the same behavior as vitest tests.
 * Run after build: pnpm build && deno task test
 */
import {
  notionBlocksToMarkdown,
  markdownToNotionBlocks,
  richTextToInlineMarkdown,
  inlineMarkdownToRichText,
} from "./dist/index.js";

// Minimal inline types for Deno test (avoids relying on package type re-exports)
type RT = { type: string; text?: { content: string }; plain_text: string; annotations?: Record<string, unknown> };
type Block = { type: string; paragraph?: { rich_text: RT[] }; heading_1?: { rich_text: RT[] }; divider?: object };

Deno.test("notionBlocksToMarkdown - paragraph", () => {
  const blocks: Block[] = [
    {
      type: "paragraph",
      paragraph: {
        rich_text: [
          { type: "text", text: { content: "Hello" }, plain_text: "Hello" },
        ],
      },
    },
  ];
  if (notionBlocksToMarkdown(blocks) !== "Hello") {
    throw new Error("expected 'Hello'");
  }
});

Deno.test("notionBlocksToMarkdown - heading_1", () => {
  const blocks: Block[] = [
    {
      type: "heading_1",
      heading_1: {
        rich_text: [
          { type: "text", text: { content: "Title" }, plain_text: "Title" },
        ],
      },
    },
  ];
  if (notionBlocksToMarkdown(blocks) !== "# Title") {
    throw new Error("expected '# Title'");
  }
});

Deno.test("notionBlocksToMarkdown - divider", () => {
  const blocks: Block[] = [{ type: "divider", divider: {} }];
  if (notionBlocksToMarkdown(blocks) !== "---") {
    throw new Error("expected '---'");
  }
});

Deno.test("markdownToNotionBlocks - paragraph", () => {
  const blocks = markdownToNotionBlocks("Hello");
  if (blocks.length !== 1 || blocks[0].type !== "paragraph") {
    throw new Error("expected one paragraph block");
  }
  const rt = (blocks[0].paragraph as { rich_text: RT[] })
    .rich_text[0];
  if (rt.plain_text !== "Hello") {
    throw new Error("expected plain_text 'Hello'");
  }
});

Deno.test("markdownToNotionBlocks - heading and divider", () => {
  const h = markdownToNotionBlocks("# Title");
  if (h.length !== 1 || h[0].type !== "heading_1") {
    throw new Error("expected heading_1");
  }
  const d = markdownToNotionBlocks("---");
  if (d.length !== 1 || d[0].type !== "divider") {
    throw new Error("expected divider");
  }
});

Deno.test("round-trip paragraph", () => {
  const blocks: Block[] = [
    {
      type: "paragraph",
      paragraph: {
        rich_text: [
          { type: "text", text: { content: "Hi" }, plain_text: "Hi" },
        ],
      },
    },
  ];
  const md = notionBlocksToMarkdown(blocks);
  const back = markdownToNotionBlocks(md);
  if (
    back.length !== 1 ||
    back[0].type !== "paragraph" ||
    (back[0].paragraph as { rich_text: RT[] }).rich_text[0]
      .plain_text !== "Hi"
  ) {
    throw new Error("round-trip failed");
  }
});

Deno.test("richTextToInlineMarkdown - plain and bold", () => {
  const rt: RT[] = [
    { type: "text", text: { content: "Hi" }, plain_text: "Hi" },
  ];
  if (richTextToInlineMarkdown(rt) !== "Hi") {
    throw new Error("expected 'Hi'");
  }
  const bold: RT[] = [
    {
      type: "text",
      text: { content: "bold" },
      plain_text: "bold",
      annotations: {
        bold: true,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: "default",
      },
    },
  ];
  if (richTextToInlineMarkdown(bold) !== "**bold**") {
    throw new Error("expected '**bold**'");
  }
});

Deno.test("inlineMarkdownToRichText - plain and bold", () => {
  const rt = inlineMarkdownToRichText("Hi");
  if (rt.length !== 1 || rt[0].plain_text !== "Hi") {
    throw new Error("expected one segment 'Hi'");
  }
  const boldRt = inlineMarkdownToRichText("**bold**");
  if (
    boldRt.length !== 1 ||
    boldRt[0].plain_text !== "bold" ||
    !boldRt[0].annotations?.bold
  ) {
    throw new Error("expected bold annotation");
  }
});
