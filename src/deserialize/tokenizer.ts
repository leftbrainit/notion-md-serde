import { getIndentDepth } from "../utils/indentation";

const COLOR_ATTR_RE = /\s*\{color="([^"]*)"\}\s*$/;

export type Token =
  | { type: "heading"; level: 1 | 2 | 3; toggleable: boolean; content: string; color?: string; depth: number }
  | { type: "paragraph"; content: string; color?: string; depth: number }
  | { type: "bulleted_list"; content: string; color?: string; depth: number }
  | { type: "numbered_list"; content: string; color?: string; depth: number }
  | { type: "todo"; checked: boolean; content: string; color?: string; depth: number }
  | { type: "toggle"; content: string; color?: string; depth: number }
  | { type: "quote"; content: string; color?: string; depth: number }
  | { type: "divider"; depth: number }
  | { type: "code_start"; language: string; depth: number }
  | { type: "code_content"; content: string }
  | { type: "code_end" }
  | { type: "equation_start"; depth: number }
  | { type: "equation_content"; content: string }
  | { type: "equation_end" }
  | { type: "xml_open"; tag: string; attributes: Record<string, string>; depth: number }
  | { type: "xml_close"; tag: string }
  | { type: "xml_self_closing"; tag: string; attributes: Record<string, string>; depth: number }
  | { type: "image"; alt: string; url: string; depth: number }
  | { type: "empty_block"; depth: number }
  | { type: "indent"; depth: number };

function stripColor(line: string): { content: string; color?: string } {
  const m = line.match(COLOR_ATTR_RE);
  if (!m) return { content: line.trimEnd() };
  return { content: line.slice(0, line.length - m[0].length).trimEnd(), color: m[1] || undefined };
}

const TOGGLE_PREFIX = "▶";

export function* tokenizeLines(lines: string[]): Generator<Token> {
  let inCode = false;
  let codeLang = "";
  let inEquation = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const depth = getIndentDepth(raw);
    const trimmed = raw.slice(depth);

    if (inCode) {
      if (trimmed.startsWith("```")) {
        inCode = false;
        yield { type: "code_end" };
        continue;
      }
      yield { type: "code_content", content: raw };
      continue;
    }
    if (inEquation) {
      if (trimmed.startsWith("$$")) {
        const rest = trimmed.slice(2).trim();
        if (rest) yield { type: "equation_content", content: rest };
        inEquation = false;
        yield { type: "equation_end" };
        continue;
      }
      yield { type: "equation_content", content: raw };
      continue;
    }

    if (trimmed === "") continue;
    if (trimmed === "<empty-block/>") {
      yield { type: "empty_block", depth };
      continue;
    }
    if (trimmed === "---") {
      yield { type: "divider", depth };
      continue;
    }

    if (trimmed.startsWith("```")) {
      codeLang = trimmed.slice(3).trim();
      inCode = true;
      yield { type: "code_start", language: codeLang, depth };
      continue;
    }
    if (trimmed.startsWith("$$")) {
      const rest = trimmed.slice(2).trim();
      if (rest) yield { type: "equation_content", content: rest };
      inEquation = true;
      yield { type: "equation_start", depth };
      continue;
    }

    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imgMatch) {
      yield { type: "image", alt: imgMatch[1], url: imgMatch[2], depth };
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const { content, color } = stripColor(trimmed.slice(2));
      yield { type: "quote", content, color, depth };
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3;
      const { content, color } = stripColor(headingMatch[2]);
      yield { type: "heading", level, toggleable: false, content, color, depth };
      continue;
    }
    if (trimmed.startsWith(TOGGLE_PREFIX)) {
      const after = trimmed.slice(TOGGLE_PREFIX.length).trim();
      const toggleHeading = after.match(/^(#{1,3})\s+(.*)$/);
      if (toggleHeading) {
        const level = Math.min(toggleHeading[1].length, 3) as 1 | 2 | 3;
        const { content, color } = stripColor(toggleHeading[2]);
        yield { type: "heading", level, toggleable: true, content, color, depth };
        continue;
      }
      const { content, color } = stripColor(after);
      yield { type: "toggle", content, color, depth };
      continue;
    }

    const todoMatch = trimmed.match(/^-\s*\[([ xX])\]\s+(.*)$/);
    if (todoMatch) {
      const { content, color } = stripColor(todoMatch[2]);
      yield { type: "todo", checked: /x/i.test(todoMatch[1]), content, color, depth };
      continue;
    }
    if (trimmed.match(/^-\s+/)) {
      const { content, color } = stripColor(trimmed.slice(2));
      yield { type: "bulleted_list", content, color, depth };
      continue;
    }
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const { content, color } = stripColor(numMatch[2]);
      yield { type: "numbered_list", content, color, depth };
      continue;
    }

    const selfClose = trimmed.match(/^<([a-z_]+)([^>]*)\s*\/>\s*$/);
    if (selfClose) {
      const tag = selfClose[1];
      const attrStr = selfClose[2].trim();
      const attributes = parseXmlAttrs(attrStr);
      yield { type: "xml_self_closing", tag, attributes, depth };
      continue;
    }

    const openTag = trimmed.match(/^<([a-z_]+)([^>]*)>\s*$/);
    if (openTag) {
      const tag = openTag[1];
      const attrStr = openTag[2].trim();
      const attributes = parseXmlAttrs(attrStr);
      yield { type: "xml_open", tag, attributes, depth };
      continue;
    }
    const closeTag = trimmed.match(/^<\/([a-z_]+)>\s*$/);
    if (closeTag) {
      yield { type: "xml_close", tag: closeTag[1] };
      continue;
    }

    const { content, color } = stripColor(trimmed);
    yield { type: "paragraph", content, color, depth };
  }
}

function parseXmlAttrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(\w+)=["']([^"']*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out[m[1]] = m[2];
  return out;
}

export function tokenize(markdown: string): Token[] {
  const lines = markdown.split(/\r?\n/);
  return [...tokenizeLines(lines)];
}
