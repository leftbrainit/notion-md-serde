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
  let out = content;
  if (ann.code) out = `\`${out}\``;
  if (ann.bold && ann.italic) out = `***${out}***`;
  else if (ann.bold) out = `**${out}**`;
  else if (ann.italic) out = `*${out}*`;
  if (ann.strikethrough) out = `~~${out}~~`;
  if (ann.underline) out = `__${out}__`;
  return out;
}

function escapeContent(content: string, isCode: boolean): string {
  return isCode ? content : escapeForMarkdown(content);
}

function serializeMention(rt: NotionRichText): string {
  const m = rt.mention;
  if (!m) return rt.plain_text ?? "";
  if ("page" in m && m.page) return `<mention-page id="${m.page.id}">${rt.plain_text ?? ""}</mention-page>`;
  if ("database" in m && m.database) return `<mention-database id="${m.database.id}">${rt.plain_text ?? ""}</mention-database>`;
  if ("user" in m && m.user) return `<mention-user id="${m.user.id}">${rt.plain_text ?? ""}</mention-user>`;
  if ("date" in m && m.date) {
    const { start, end } = m.date;
    const attrs = end ? ` start="${start}" end="${end}"` : ` start="${start}"`;
    return `<mention-date${attrs}>${rt.plain_text ?? start}</mention-date>`;
  }
  return rt.plain_text ?? "";
}

/**
 * Convert a Notion rich text array to inline Notion-flavored Markdown.
 */
export function richTextToInlineMarkdown(richText: NotionRichText[]): string {
  const parts: string[] = [];
  for (const rt of richText) {
    const ann = { ...DEFAULT_ANNOTATIONS, ...rt.annotations };
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
