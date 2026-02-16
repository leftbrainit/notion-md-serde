import type { NotionBlock } from "../types";
import type { BlockNode } from "./parser";
import { inlineMarkdownToRichText } from "./rich-text";
import { isValidNotionColor } from "../utils/colors";
import type { DeserializeOptions } from "../types";

const DEFAULT_OPTIONS: Required<DeserializeOptions> = {
  strict: false,
  enforceNotionLimits: false,
};

function richTextOption(opts?: DeserializeOptions): { enforceNotionLimits: boolean } {
  return { enforceNotionLimits: opts?.enforceNotionLimits ?? false };
}

function colorPayload(color: string | undefined): { color: string } | undefined {
  if (!color || !isValidNotionColor(color)) return undefined;
  if (color === "default") return undefined;
  return { color };
}

export function emitBlock(node: BlockNode, options?: DeserializeOptions): NotionBlock {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rtOpts = richTextOption(opts);
  const richText = node.content != null ? inlineMarkdownToRichText(node.content, rtOpts) : [];
  const color = colorPayload(node.color);

  switch (node.type) {
    case "paragraph": {
      const payload: Record<string, unknown> = { rich_text: richText };
      if (color) payload.color = color.color;
      return { type: "paragraph", paragraph: payload };
    }
    case "heading": {
      const key = `heading_${node.level ?? 1}` as "heading_1" | "heading_2" | "heading_3";
      const payload: Record<string, unknown> = { rich_text: richText };
      if (color) payload.color = color.color;
      if (node.toggleable) payload.is_toggleable = true;
      return { type: key, [key]: payload };
    }
    case "bulleted_list_item": {
      const payload: Record<string, unknown> = { rich_text: richText };
      if (color) payload.color = color.color;
      const children = node.children.map((c) => emitBlock(c, options));
      if (children.length) payload.children = children;
      return { type: "bulleted_list_item", bulleted_list_item: payload };
    }
    case "numbered_list_item": {
      const payload: Record<string, unknown> = { rich_text: richText };
      if (color) payload.color = color.color;
      const children = node.children.map((c) => emitBlock(c, options));
      if (children.length) payload.children = children;
      return { type: "numbered_list_item", numbered_list_item: payload };
    }
    case "to_do": {
      const payload: Record<string, unknown> = { rich_text: richText, checked: node.checked ?? false };
      if (color) payload.color = color.color;
      const children = node.children.map((c) => emitBlock(c, options));
      if (children.length) payload.children = children;
      return { type: "to_do", to_do: payload };
    }
    case "toggle": {
      const payload: Record<string, unknown> = { rich_text: richText };
      if (color) payload.color = color.color;
      const children = node.children.map((c) => emitBlock(c, options));
      if (children.length) payload.children = children;
      return { type: "toggle", toggle: payload };
    }
    case "quote": {
      const payload: Record<string, unknown> = { rich_text: richText };
      if (color) payload.color = color.color;
      return { type: "quote", quote: payload };
    }
    case "divider":
      return { type: "divider", divider: {} };
    case "code": {
      const codeRt = (node.content ?? "").split("\n").length
        ? inlineMarkdownToRichText(node.content ?? "", rtOpts)
        : [{ type: "text", text: { content: node.content ?? "" }, plain_text: node.content ?? "" }];
      const payload: Record<string, unknown> = { rich_text: codeRt, language: (node.language as string) || "plain text" };
      return { type: "code", code: payload };
    }
    case "equation":
      return { type: "equation", equation: { expression: node.content ?? "" } };
    case "image":
      return {
        type: "image",
        image: { type: "external", external: { url: node.url ?? "" }, caption: node.alt ? [{ type: "text", text: { content: node.alt }, plain_text: node.alt }] : [] },
      };
    case "xml": {
      const tag = (node as BlockNode & { tag: string }).tag;
      const attrs = (node as BlockNode & { attributes?: Record<string, string> }).attributes ?? {};
      if (tag === "table_of_contents") {
        const payload: Record<string, unknown> = {};
        if (attrs.color) payload.color = attrs.color;
        return { type: "table_of_contents", table_of_contents: payload };
      }
      if (tag === "breadcrumb") return { type: "breadcrumb", breadcrumb: {} };
      if (tag === "link_preview" && attrs.url)
        return { type: "link_preview", link_preview: { url: attrs.url } };
      return { type: "paragraph", paragraph: { rich_text: richText } };
    }
    default:
      return { type: "paragraph", paragraph: { rich_text: richText } };
  }
}

export function emitBlocks(nodes: BlockNode[], options?: DeserializeOptions): NotionBlock[] {
  return nodes.map((n) => emitBlock(n, options));
}
