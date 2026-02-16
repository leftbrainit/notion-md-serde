'use strict';

// src/utils/indentation.ts
function getIndentDepth(line) {
  let i = 0;
  while (line[i] === "	") i++;
  return i;
}

// src/deserialize/tokenizer.ts
var COLOR_ATTR_RE = /\s*\{color="([^"]*)"\}\s*$/;
function stripColor(line) {
  const m = line.match(COLOR_ATTR_RE);
  if (!m) return { content: line.trimEnd() };
  return { content: line.slice(0, line.length - m[0].length).trimEnd(), color: m[1] || void 0 };
}
var TOGGLE_PREFIX = "\u25B6";
function* tokenizeLines(lines) {
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
      const { content: content2, color: color2 } = stripColor(trimmed.slice(2));
      yield { type: "quote", content: content2, color: color2, depth };
      continue;
    }
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 3);
      const { content: content2, color: color2 } = stripColor(headingMatch[2]);
      yield { type: "heading", level, toggleable: false, content: content2, color: color2, depth };
      continue;
    }
    if (trimmed.startsWith(TOGGLE_PREFIX)) {
      const after = trimmed.slice(TOGGLE_PREFIX.length).trim();
      const toggleHeading = after.match(/^(#{1,3})\s+(.*)$/);
      if (toggleHeading) {
        const level = Math.min(toggleHeading[1].length, 3);
        const { content: content3, color: color3 } = stripColor(toggleHeading[2]);
        yield { type: "heading", level, toggleable: true, content: content3, color: color3, depth };
        continue;
      }
      const { content: content2, color: color2 } = stripColor(after);
      yield { type: "toggle", content: content2, color: color2, depth };
      continue;
    }
    const todoMatch = trimmed.match(/^-\s*\[([ xX])\]\s+(.*)$/);
    if (todoMatch) {
      const { content: content2, color: color2 } = stripColor(todoMatch[2]);
      yield { type: "todo", checked: /x/i.test(todoMatch[1]), content: content2, color: color2, depth };
      continue;
    }
    if (trimmed.match(/^-\s+/)) {
      const { content: content2, color: color2 } = stripColor(trimmed.slice(2));
      yield { type: "bulleted_list", content: content2, color: color2, depth };
      continue;
    }
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const { content: content2, color: color2 } = stripColor(numMatch[2]);
      yield { type: "numbered_list", content: content2, color: color2, depth };
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
function parseXmlAttrs(s) {
  const out = {};
  const re = /(\w+)=["']([^"']*)["']/g;
  let m;
  while (m = re.exec(s)) out[m[1]] = m[2];
  return out;
}
function tokenize(markdown) {
  const lines = markdown.split(/\r?\n/);
  return [...tokenizeLines(lines)];
}

// src/deserialize/parser.ts
function parseToBlockTree(tokens) {
  const stack = [];
  const roots = [];
  let codeContent = [];
  let equationContent = [];
  let codeLang = "";
  let codeDepth = 0;
  let equationDepth = 0;
  function flushCode() {
    if (codeContent.length === 0) return null;
    const node = { type: "code", content: codeContent.join("\n"), language: codeLang, children: [] };
    codeContent = [];
    return node;
  }
  function flushEquation() {
    if (equationContent.length === 0) return null;
    const node = { type: "equation", content: equationContent.join("\n"), children: [] };
    equationContent = [];
    return node;
  }
  function addBlock(depth, node) {
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();
    if (stack.length === 0) {
      roots.push(node);
      stack.push({ depth, node });
    } else {
      const parent = stack[stack.length - 1].node;
      parent.children.push(node);
      stack.push({ depth, node });
    }
  }
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "code_content") {
      codeContent.push(t.content);
      continue;
    }
    if (t.type === "code_end") {
      const node = flushCode();
      if (node) addBlock(codeDepth, node);
      continue;
    }
    if (t.type === "equation_content") {
      equationContent.push(t.content);
      continue;
    }
    if (t.type === "equation_end") {
      const node = flushEquation();
      if (node) addBlock(equationDepth, node);
      continue;
    }
    const depth = "depth" in t ? t.depth : 0;
    if (t.type === "code_start") {
      codeLang = t.language;
      codeDepth = depth;
      codeContent = [];
      continue;
    }
    if (t.type === "equation_start") {
      equationDepth = depth;
      equationContent = [];
      continue;
    }
    if (t.type === "heading") {
      addBlock(depth, {
        type: "heading",
        content: t.content,
        color: t.color,
        level: t.level,
        toggleable: t.toggleable,
        children: []
      });
      continue;
    }
    if (t.type === "paragraph") {
      addBlock(depth, { type: "paragraph", content: t.content, color: t.color, children: [] });
      continue;
    }
    if (t.type === "bulleted_list") {
      addBlock(depth, { type: "bulleted_list_item", content: t.content, color: t.color, children: [] });
      continue;
    }
    if (t.type === "numbered_list") {
      addBlock(depth, { type: "numbered_list_item", content: t.content, color: t.color, children: [] });
      continue;
    }
    if (t.type === "todo") {
      addBlock(depth, { type: "to_do", content: t.content, color: t.color, checked: t.checked, children: [] });
      continue;
    }
    if (t.type === "toggle") {
      addBlock(depth, { type: "toggle", content: t.content, color: t.color, children: [] });
      continue;
    }
    if (t.type === "quote") {
      addBlock(depth, { type: "quote", content: t.content, color: t.color, children: [] });
      continue;
    }
    if (t.type === "divider") {
      addBlock(depth, { type: "divider", children: [] });
      continue;
    }
    if (t.type === "image") {
      addBlock(depth, { type: "image", alt: t.alt, url: t.url, children: [] });
      continue;
    }
    if (t.type === "empty_block") {
      addBlock(depth, { type: "paragraph", content: "", children: [] });
      continue;
    }
    if (t.type === "xml_self_closing") {
      addBlock(depth, { type: "xml", tag: t.tag, attributes: t.attributes, children: [] });
      continue;
    }
  }
  return roots;
}

// src/utils/escaping.ts
var MARKDOWN_ESCAPE_RE = /\\([*_~`#\[\]()\\<>$])/g;
function unescapeMarkdown(s) {
  return s.replace(MARKDOWN_ESCAPE_RE, "$1");
}

// src/deserialize/rich-text-defaults.ts
var DEFAULT_ANNOTATIONS = {
  bold: false,
  italic: false,
  strikethrough: false,
  underline: false,
  code: false,
  color: "default"
};

// src/deserialize/rich-text.ts
var MAX_RICH_TEXT_CHARS = 2e3;
function defaultAnnotations() {
  return { ...DEFAULT_ANNOTATIONS };
}
function parseMentionTag(markdown, start) {
  const open = markdown.indexOf(">", start);
  if (open === -1) return null;
  const tag = markdown.slice(start + 1, open);
  const space = tag.indexOf(" ");
  const tagName = space === -1 ? tag : tag.slice(0, space);
  const rest = space === -1 ? "" : tag.slice(space + 1);
  const attrs = {};
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
  const closeTag = tagName.replace(/^mention-/, "");
  const close = `</${tagName}>`;
  const closeIdx = markdown.indexOf(close, open + 1);
  if (closeIdx === -1) return null;
  const body = markdown.slice(open + 1, closeIdx);
  let mention;
  if (closeTag === "page" && attrs.id) mention = { type: "page", page: { id: attrs.id } };
  else if (closeTag === "database" && attrs.id) mention = { type: "database", database: { id: attrs.id } };
  else if (closeTag === "user" && attrs.id) mention = { type: "user", user: { id: attrs.id } };
  else if (closeTag === "date" && attrs.start) mention = { type: "date", date: { start: attrs.start, end: attrs.end ?? null } };
  else return null;
  const rt = {
    type: "mention",
    mention,
    plain_text: body
  };
  return { end: closeIdx + close.length, rt };
}
function parseLink(markdown, start) {
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
function parseInlineEquation(markdown, start) {
  if (markdown[start] !== "$" || markdown[start + 1] === "$") return null;
  const end = markdown.indexOf("$", start + 1);
  if (end === -1) return null;
  return { end: end + 1, expr: markdown.slice(start + 1, end) };
}
function parseInlineCode(markdown, start) {
  if (markdown[start] !== "`") return null;
  let i = start + 1;
  while (i < markdown.length && markdown[i] !== "`") i++;
  if (i >= markdown.length) return null;
  return { end: i + 1, content: markdown.slice(start + 1, i) };
}
function nextDelimiter(markdown, from) {
  const candidates = [];
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
function parseInlineRec(markdown, start, end) {
  const result = [];
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
          href: parsed.url
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
          annotations: { ...defaultAnnotations(), code: true }
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
function splitRichTextIfNeeded(richText, enforceLimits) {
  if (!enforceLimits) return richText;
  const out = [];
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
        plain_text: chunk
      });
    }
  }
  return out;
}
function inlineMarkdownToRichText(markdown, options) {
  const raw = parseInlineRec(markdown, 0, markdown.length);
  return splitRichTextIfNeeded(raw, options?.enforceNotionLimits ?? false);
}

// src/utils/colors.ts
var NOTION_COLORS = /* @__PURE__ */ new Set([
  "default",
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
  "gray_background",
  "brown_background",
  "orange_background",
  "yellow_background",
  "green_background",
  "blue_background",
  "purple_background",
  "pink_background",
  "red_background"
]);
function isValidNotionColor(color) {
  return NOTION_COLORS.has(color);
}

// src/deserialize/emitter.ts
var DEFAULT_OPTIONS = {
  strict: false,
  enforceNotionLimits: false
};
function richTextOption(opts) {
  return { enforceNotionLimits: opts?.enforceNotionLimits ?? false };
}
function colorPayload(color) {
  if (!color || !isValidNotionColor(color)) return void 0;
  if (color === "default") return void 0;
  return { color };
}
function emitBlock(node, options) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rtOpts = richTextOption(opts);
  const richText = node.content != null ? inlineMarkdownToRichText(node.content, rtOpts) : [];
  const color = colorPayload(node.color);
  switch (node.type) {
    case "paragraph": {
      const payload = { rich_text: richText };
      if (color) payload.color = color.color;
      return { type: "paragraph", paragraph: payload };
    }
    case "heading": {
      const key = `heading_${node.level ?? 1}`;
      const payload = { rich_text: richText };
      if (color) payload.color = color.color;
      if (node.toggleable) payload.is_toggleable = true;
      return { type: key, [key]: payload };
    }
    case "bulleted_list_item": {
      const payload = { rich_text: richText };
      if (color) payload.color = color.color;
      const children = node.children.map((c) => emitBlock(c, options));
      if (children.length) payload.children = children;
      return { type: "bulleted_list_item", bulleted_list_item: payload };
    }
    case "numbered_list_item": {
      const payload = { rich_text: richText };
      if (color) payload.color = color.color;
      const children = node.children.map((c) => emitBlock(c, options));
      if (children.length) payload.children = children;
      return { type: "numbered_list_item", numbered_list_item: payload };
    }
    case "to_do": {
      const payload = { rich_text: richText, checked: node.checked ?? false };
      if (color) payload.color = color.color;
      const children = node.children.map((c) => emitBlock(c, options));
      if (children.length) payload.children = children;
      return { type: "to_do", to_do: payload };
    }
    case "toggle": {
      const payload = { rich_text: richText };
      if (color) payload.color = color.color;
      const children = node.children.map((c) => emitBlock(c, options));
      if (children.length) payload.children = children;
      return { type: "toggle", toggle: payload };
    }
    case "quote": {
      const payload = { rich_text: richText };
      if (color) payload.color = color.color;
      return { type: "quote", quote: payload };
    }
    case "divider":
      return { type: "divider", divider: {} };
    case "code": {
      const codeRt = (node.content ?? "").split("\n").length ? inlineMarkdownToRichText(node.content ?? "", rtOpts) : [{ type: "text", text: { content: node.content ?? "" }, plain_text: node.content ?? "" }];
      const payload = { rich_text: codeRt, language: node.language || "plain text" };
      return { type: "code", code: payload };
    }
    case "equation":
      return { type: "equation", equation: { expression: node.content ?? "" } };
    case "image":
      return {
        type: "image",
        image: { type: "external", external: { url: node.url ?? "" }, caption: node.alt ? [{ type: "text", text: { content: node.alt }, plain_text: node.alt }] : [] }
      };
    case "xml": {
      const tag = node.tag;
      const attrs = node.attributes ?? {};
      if (tag === "table_of_contents") {
        const payload = {};
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
function emitBlocks(nodes, options) {
  return nodes.map((n) => emitBlock(n, options));
}

// src/deserialize/index-impl.ts
function markdownToNotionBlocks(markdown, options) {
  const tokens = tokenize(markdown);
  const nodes = parseToBlockTree(tokens);
  return emitBlocks(nodes, options);
}

exports.inlineMarkdownToRichText = inlineMarkdownToRichText;
exports.markdownToNotionBlocks = markdownToNotionBlocks;
//# sourceMappingURL=deserialize.cjs.map
//# sourceMappingURL=deserialize.cjs.map