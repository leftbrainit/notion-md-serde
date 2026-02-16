import type { NotionRichText, NotionAnnotations } from "../types";
import { unescapeMarkdown } from "../utils/escaping";
import { DEFAULT_ANNOTATIONS } from "./rich-text-defaults";

const MAX_RICH_TEXT_CHARS = 2000;

function defaultAnnotations(): NotionAnnotations {
  return { ...DEFAULT_ANNOTATIONS };
}

function parseMentionTag(markdown: string, start: number): { end: number; rt: NotionRichText } | null {
  const open = markdown.indexOf(">", start);
  if (open === -1) return null;
  const tag = markdown.slice(start + 1, open);
  const space = tag.indexOf(" ");
  const tagName = space === -1 ? tag : tag.slice(0, space);
  const rest = space === -1 ? "" : tag.slice(space + 1);
  const attrs: Record<string, string> = {};
  let i = 0;
  while (i < rest.length) {
    const eq = rest.indexOf("=", i);
    if (eq === -1) break;
    const key = rest.slice(i, eq).trim();
    const q = rest[eq + 1];
    if (q !== '"' && q !== "'") break;
    const endQ = rest.indexOf(q, eq + 2);
    if (endQ === -1) break;
    attrs[key] = rest.slice(eq + 2, endQ);
    i = endQ + 1;
  }
  const closeTag = tagName.replace(/^mention-/, "") as "page" | "database" | "user" | "date";
  const close = `</${tagName}>`;
  const closeIdx = markdown.indexOf(close, open + 1);
  if (closeIdx === -1) return null;
  const body = markdown.slice(open + 1, closeIdx);
  let mention: NotionRichText["mention"];
  if (closeTag === "page" && attrs.id) mention = { type: "page", page: { id: attrs.id } };
  else if (closeTag === "database" && attrs.id) mention = { type: "database", database: { id: attrs.id } };
  else if (closeTag === "user" && attrs.id) mention = { type: "user", user: { id: attrs.id } };
  else if (closeTag === "date" && attrs.start) mention = { type: "date", date: { start: attrs.start, end: attrs.end ?? null } };
  else return null;
  const rt: NotionRichText = {
    type: "mention",
    mention,
    plain_text: body,
  };
  return { end: closeIdx + close.length, rt };
}

function parseLink(markdown: string, start: number): { end: number; text: string; url: string } | null {
  if (markdown[start] !== "[") return null;
  const closeB = markdown.indexOf("]", start);
  if (closeB === -1) return null;
  if (markdown[closeB + 1] !== "(") return null;
  const closeP = markdown.indexOf(")", closeB + 2);
  if (closeP === -1) return null;
  const text = markdown.slice(start + 1, closeB);
  const url = markdown.slice(closeB + 2, closeP);
  return { end: closeP + 1, text, url };
}

function parseInlineEquation(markdown: string, start: number): { end: number; expr: string } | null {
  if (markdown[start] !== "$" || markdown[start + 1] === "$") return null;
  const end = markdown.indexOf("$", start + 1);
  if (end === -1) return null;
  return { end: end + 1, expr: markdown.slice(start + 1, end) };
}

function parseInlineCode(markdown: string, start: number): { end: number; content: string } | null {
  if (markdown[start] !== "`") return null;
  let i = start + 1;
  while (i < markdown.length && markdown[i] !== "`") i++;
  if (i >= markdown.length) return null;
  return { end: i + 1, content: markdown.slice(start + 1, i) };
}

/** Find next potential delimiter; returns index or -1 */
function nextDelimiter(markdown: string, from: number): { idx: number; kind: string } | null {
  const candidates: { idx: number; kind: string }[] = [];
  const backslash = markdown.indexOf("\\", from);
  if (backslash !== -1) candidates.push({ idx: backslash, kind: "escape" });
  const mention = markdown.indexOf("<mention-", from);
  if (mention !== -1) candidates.push({ idx: mention, kind: "mention" });
  const link = markdown.indexOf("[", from);
  if (link !== -1) candidates.push({ idx: link, kind: "link" });
  const eq = markdown.indexOf("$", from);
  if (eq !== -1 && markdown[eq + 1] !== "$") candidates.push({ idx: eq, kind: "equation" });
  const code = markdown.indexOf("`", from);
  if (code !== -1) candidates.push({ idx: code, kind: "code" });
  const bold = markdown.indexOf("**", from);
  if (bold !== -1) candidates.push({ idx: bold, kind: "bold" });
  const strike = markdown.indexOf("~~", from);
  if (strike !== -1) candidates.push({ idx: strike, kind: "strike" });
  const under = markdown.indexOf("__", from);
  if (under !== -1) candidates.push({ idx: under, kind: "underline" });
  const star = markdown.indexOf("*", from);
  if (star !== -1) candidates.push({ idx: star, kind: "italic" });
  const underscore = markdown.indexOf("_", from);
  if (underscore !== -1) candidates.push({ idx: underscore, kind: "italic_" });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.idx - b.idx);
  return candidates[0];
}

function parseInlineRec(markdown: string, start: number, end: number): NotionRichText[] {
  const result: NotionRichText[] = [];
  let i = start;
  while (i < end) {
    const next = nextDelimiter(markdown, i);
    if (!next || next.idx >= end) {
      const raw = markdown.slice(i, end);
      if (raw) result.push({ type: "text", text: { content: unescapeMarkdown(raw) }, plain_text: unescapeMarkdown(raw) });
      break;
    }
    if (next.idx > i) {
      const raw = markdown.slice(i, next.idx);
      if (raw) result.push({ type: "text", text: { content: unescapeMarkdown(raw) }, plain_text: unescapeMarkdown(raw) });
    }
    if (next.kind === "escape") {
      if (next.idx + 1 < end) {
        result.push({ type: "text", text: { content: markdown[next.idx + 1] }, plain_text: markdown[next.idx + 1] });
        i = next.idx + 2;
      } else i = next.idx + 1;
      continue;
    }
    if (next.kind === "mention") {
      const parsed = parseMentionTag(markdown, next.idx);
      if (parsed && parsed.end <= end) {
        result.push(parsed.rt);
        i = parsed.end;
        continue;
      }
    }
    if (next.kind === "link") {
      const parsed = parseLink(markdown, next.idx);
      if (parsed && parsed.end <= end) {
        const content = unescapeMarkdown(parsed.text);
        result.push({
          type: "text",
          text: { content, link: { url: parsed.url } },
          plain_text: content,
          href: parsed.url,
        });
        i = parsed.end;
        continue;
      }
    }
    if (next.kind === "equation") {
      const parsed = parseInlineEquation(markdown, next.idx);
      if (parsed && parsed.end <= end) {
        result.push({ type: "equation", equation: { expression: parsed.expr } });
        i = parsed.end;
        continue;
      }
    }
    if (next.kind === "code") {
      const parsed = parseInlineCode(markdown, next.idx);
      if (parsed && parsed.end <= end) {
        result.push({
          type: "text",
          text: { content: parsed.content },
          plain_text: parsed.content,
          annotations: { ...defaultAnnotations(), code: true },
        });
        i = parsed.end;
        continue;
      }
    }
    if (next.kind === "bold" && markdown.slice(next.idx, next.idx + 2) === "**") {
      const close = markdown.indexOf("**", next.idx + 2);
      if (close !== -1 && close <= end) {
        const inner = parseInlineRec(markdown, next.idx + 2, close);
        const content = inner.map((r) => r.plain_text ?? r.text?.content ?? "").join("");
        const ann = inner.length === 1 && inner[0].annotations ? { ...inner[0].annotations, bold: true } : { ...defaultAnnotations(), bold: true };
        result.push({ type: "text", text: { content }, plain_text: content, annotations: ann });
        i = close + 2;
        continue;
      }
    }
    if (next.kind === "strike" && markdown.slice(next.idx, next.idx + 2) === "~~") {
      const close = markdown.indexOf("~~", next.idx + 2);
      if (close !== -1 && close <= end) {
        const inner = parseInlineRec(markdown, next.idx + 2, close);
        const content = inner.map((r) => r.plain_text ?? r.text?.content ?? "").join("");
        const ann = inner.length === 1 && inner[0].annotations ? { ...inner[0].annotations, strikethrough: true } : { ...defaultAnnotations(), strikethrough: true };
        result.push({ type: "text", text: { content }, plain_text: content, annotations: ann });
        i = close + 2;
        continue;
      }
    }
    if (next.kind === "underline" && markdown.slice(next.idx, next.idx + 2) === "__") {
      const close = markdown.indexOf("__", next.idx + 2);
      if (close !== -1 && close <= end) {
        const inner = parseInlineRec(markdown, next.idx + 2, close);
        const content = inner.map((r) => r.plain_text ?? r.text?.content ?? "").join("");
        const ann = inner.length === 1 && inner[0].annotations ? { ...inner[0].annotations, underline: true } : { ...defaultAnnotations(), underline: true };
        result.push({ type: "text", text: { content }, plain_text: content, annotations: ann });
        i = close + 2;
        continue;
      }
    }
    if ((next.kind === "italic" || next.kind === "italic_") && markdown[next.idx] === "*" && markdown[next.idx + 1] !== "*") {
      const close = markdown.indexOf("*", next.idx + 1);
      if (close !== -1 && close <= end && (close === next.idx + 1 || markdown[close + 1] !== "*")) {
        const inner = parseInlineRec(markdown, next.idx + 1, close);
        const content = inner.map((r) => r.plain_text ?? r.text?.content ?? "").join("");
        const ann = inner.length === 1 && inner[0].annotations ? { ...inner[0].annotations, italic: true } : { ...defaultAnnotations(), italic: true };
        result.push({ type: "text", text: { content }, plain_text: content, annotations: ann });
        i = close + 1;
        continue;
      }
    }
    if ((next.kind === "italic" || next.kind === "italic_") && markdown[next.idx] === "_" && markdown.slice(next.idx, next.idx + 2) !== "__") {
      const close = markdown.indexOf("_", next.idx + 1);
      if (close !== -1 && close <= end && markdown[close - 1] !== "_") {
        const inner = parseInlineRec(markdown, next.idx + 1, close);
        const content = inner.map((r) => r.plain_text ?? r.text?.content ?? "").join("");
        const ann = inner.length === 1 && inner[0].annotations ? { ...inner[0].annotations, italic: true } : { ...defaultAnnotations(), italic: true };
        result.push({ type: "text", text: { content }, plain_text: content, annotations: ann });
        i = close + 1;
        continue;
      }
    }
    result.push({ type: "text", text: { content: markdown[next.idx] }, plain_text: markdown[next.idx] });
    i = next.idx + 1;
  }
  return result;
}

function splitRichTextIfNeeded(richText: NotionRichText[], enforceLimits: boolean): NotionRichText[] {
  if (!enforceLimits) return richText;
  const out: NotionRichText[] = [];
  for (const rt of richText) {
    const plain = rt.plain_text ?? rt.text?.content ?? "";
    if (plain.length <= MAX_RICH_TEXT_CHARS) {
      out.push(rt);
      continue;
    }
    for (let i = 0; i < plain.length; i += MAX_RICH_TEXT_CHARS) {
      const chunk = plain.slice(i, i + MAX_RICH_TEXT_CHARS);
      out.push({
        ...rt,
        text: rt.text ? { ...rt.text, content: chunk } : { content: chunk },
        plain_text: chunk,
      });
    }
  }
  return out;
}

/**
 * Parse inline Notion-flavored Markdown into a Notion rich text array.
 */
export function inlineMarkdownToRichText(markdown: string, options?: { enforceNotionLimits?: boolean }): NotionRichText[] {
  const raw = parseInlineRec(markdown, 0, markdown.length);
  return splitRichTextIfNeeded(raw, options?.enforceNotionLimits ?? false);
}
