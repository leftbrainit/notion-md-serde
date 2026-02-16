import { describe, it, expect } from "vitest";
import {
  notionBlocksToMarkdown,
  markdownToNotionBlocks,
  richTextToInlineMarkdown,
  inlineMarkdownToRichText,
} from "./index";
import type { NotionBlock, NotionRichText } from "./types";

describe("notionBlocksToMarkdown", () => {
  it("serializes paragraph to markdown", () => {
    const blocks: NotionBlock[] = [
      {
        type: "paragraph",
        paragraph: { rich_text: [{ type: "text", text: { content: "Hello" }, plain_text: "Hello" }] },
      },
    ];
    expect(notionBlocksToMarkdown(blocks)).toBe("Hello");
  });

  it("serializes heading_1", () => {
    const blocks: NotionBlock[] = [
      {
        type: "heading_1",
        heading_1: { rich_text: [{ type: "text", text: { content: "Title" }, plain_text: "Title" }] },
      },
    ];
    expect(notionBlocksToMarkdown(blocks)).toBe("# Title");
  });

  it("serializes divider", () => {
    const blocks: NotionBlock[] = [{ type: "divider", divider: {} }];
    expect(notionBlocksToMarkdown(blocks)).toBe("---");
  });
});

describe("markdownToNotionBlocks", () => {
  it("parses paragraph", () => {
    const blocks = markdownToNotionBlocks("Hello");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
    expect((blocks[0].paragraph as { rich_text: NotionRichText[] }).rich_text[0].plain_text).toBe("Hello");
  });

  it("parses heading", () => {
    const blocks = markdownToNotionBlocks("# Title");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("heading_1");
  });

  it("parses divider", () => {
    const blocks = markdownToNotionBlocks("---");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("divider");
  });

  it("parses empty-block", () => {
    const blocks = markdownToNotionBlocks("<empty-block/>");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
  });
});

describe("round-trip", () => {
  it("paragraph round-trips", () => {
    const blocks: NotionBlock[] = [
      {
        type: "paragraph",
        paragraph: { rich_text: [{ type: "text", text: { content: "Hi" }, plain_text: "Hi" }] },
      },
    ];
    const md = notionBlocksToMarkdown(blocks);
    const back = markdownToNotionBlocks(md);
    expect(back).toHaveLength(1);
    expect(back[0].type).toBe("paragraph");
    expect((back[0].paragraph as { rich_text: NotionRichText[] }).rich_text[0].plain_text).toBe("Hi");
  });

  it("heading round-trips", () => {
    const blocks: NotionBlock[] = [
      {
        type: "heading_1",
        heading_1: { rich_text: [{ type: "text", text: { content: "Title" }, plain_text: "Title" }] },
      },
    ];
    const md = notionBlocksToMarkdown(blocks);
    const back = markdownToNotionBlocks(md);
    expect(back).toHaveLength(1);
    expect(back[0].type).toBe("heading_1");
  });
});

describe("richTextToInlineMarkdown", () => {
  it("serializes plain text", () => {
    const rt: NotionRichText[] = [{ type: "text", text: { content: "Hi" }, plain_text: "Hi" }];
    expect(richTextToInlineMarkdown(rt)).toBe("Hi");
  });

  it("serializes bold", () => {
    const rt: NotionRichText[] = [
      {
        type: "text",
        text: { content: "bold" },
        plain_text: "bold",
        annotations: { bold: true, italic: false, strikethrough: false, underline: false, code: false, color: "default" },
      },
    ];
    expect(richTextToInlineMarkdown(rt)).toBe("**bold**");
  });
});

describe("inlineMarkdownToRichText", () => {
  it("parses plain text", () => {
    const rt = inlineMarkdownToRichText("Hi");
    expect(rt).toHaveLength(1);
    expect(rt[0].plain_text).toBe("Hi");
  });

  it("parses bold", () => {
    const rt = inlineMarkdownToRichText("**bold**");
    expect(rt).toHaveLength(1);
    expect(rt[0].plain_text).toBe("bold");
    expect(rt[0].annotations?.bold).toBe(true);
  });
});
