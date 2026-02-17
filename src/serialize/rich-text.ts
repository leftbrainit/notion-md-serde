import type { NotionRichText, NotionAnnotations } from "../types";
import { escapeForMarkdown } from "../utils/escaping";

const DEFAULT_ANNOTATIONS: NotionAnnotations = {
  bold: false,
  italic: false,
  strikethrough: false,
  underline: false,
  code: false,
  color: "default",
};

function wrapWithAnnotations(content: string, ann: NotionAnnotations): string {
  if (!content) return content;
  const needsWrap = ann.bold || ann.italic || ann.strikethrough || ann.underline || ann.code;
  if (!needsWrap) return content;

  const leadingWs = content.match(/^(\s*)/)?.[1] ?? "";
  const trailingWs = content.match(/(\s*)$/)?.[1] ?? "";
  let inner = content.slice(leadingWs.length, content.length - (trailingWs.length || 0) || content.length);
  if (!inner) return content;

  if (ann.code) inner = `\`${inner}\``;
  if (ann.bold && ann.italic) inner = `***${inner}***`;
  else if (ann.bold) inner = `**${inner}**`;
  else if (ann.italic) inner = `*${inner}*`;
  if (ann.strikethrough) inner = `~~${inner}~~`;
  if (ann.underline) inner = `__${inner}__`;
  return leadingWs + inner + trailingWs;
}

function normalizeQuotes(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"');
}

function escapeContent(content: string, isCode: boolean): string {
  const normalized = normalizeQuotes(content);
  return isCode ? normalized : escapeForMarkdown(normalized);
}

function serializeMention(rt: NotionRichText): string {
  return rt.plain_text ?? "";
}

/**
 * Convert a Notion rich text array to inline Markdown.
 * @param opts.suppressBold  When true, bold annotations are ignored (useful for headings).
 */
export function richTextToInlineMarkdown(
  richText: NotionRichText[],
  opts?: { suppressBold?: boolean },
): string {
  const parts: string[] = [];
  for (const rt of richText) {
    const ann = { ...DEFAULT_ANNOTATIONS, ...rt.annotations };
    if (opts?.suppressBold) ann.bold = false;
    if (rt.type === "equation" && rt.equation) {
      parts.push(`$${rt.equation.expression}$`);
      continue;
    }
    if (rt.type === "mention") {
      parts.push(serializeMention(rt));
      continue;
    }
    const raw = rt.plain_text ?? rt.text?.content ?? "";
    if (rt.text?.link?.url) {
      parts.push(wrapWithAnnotations(`[${escapeContent(raw, ann.code)}](${rt.text.link.url})`, ann));
    } else {
      parts.push(wrapWithAnnotations(escapeContent(raw, ann.code), ann));
    }
  }
  return parts.join("");
}
