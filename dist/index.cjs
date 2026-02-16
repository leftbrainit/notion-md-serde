'use strict';

// src/utils/indentation.ts
function tabsForDepth(depth) {
  return "	".repeat(Math.max(0, depth));
}
function getIndentDepth(line) {
  let i = 0;
  while (line[i] === "	") i++;
  return i;
}

// src/utils/escaping.ts
var MARKDOWN_ESCAPE_RE = /\\([*_~`#\[\]()\\<>$])/g;
var CHARS_TO_ESCAPE_IN_MD = /([*_~`#\[\]()\\<>$])/g;
function escapeForMarkdown(s) {
  return s.replace(CHARS_TO_ESCAPE_IN_MD, "\\$1");
}
function unescapeMarkdown(s) {
  return s.replace(MARKDOWN_ESCAPE_RE, "$1");
}

// src/serialize/rich-text.ts
var DEFAULT_ANNOTATIONS = {
  bold: false,
  italic: false,
  strikethrough: false,
  underline: false,
  code: false,
  color: "default"
};
function wrapWithAnnotations(content, ann) {
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
function escapeContent(content, isCode) {
  return isCode ? content : escapeForMarkdown(content);
}
function serializeMention(rt) {
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
function richTextToInlineMarkdown(richText) {
  const parts = [];
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
function normalizeNotionColor(color) {
  if (color && isValidNotionColor(color)) return color;
  return "default";
}

// src/serialize/block-helpers.ts
function getBlockRichText(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return [];
  const rt = payload.rich_text;
  return Array.isArray(rt) ? rt : [];
}
function getBlockColor(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return void 0;
  const color = payload.color;
  return color;
}
function blockRichTextToMd(block) {
  return richTextToInlineMarkdown(getBlockRichText(block));
}
function colorSuffix(block) {
  const color = getBlockColor(block);
  const c = normalizeNotionColor(color);
  if (c === "default") return "";
  return ` {color="${c}"}`;
}
function getBlockChildren(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return [];
  const children = payload.children;
  return Array.isArray(children) ? children : [];
}

// src/serialize/visitors/paragraph.ts
function visitParagraph(block, ctx) {
  const md = blockRichTextToMd(block);
  const color = colorSuffix(block);
  const line = (md || "") + color;
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  return [line, ...childLines];
}

// src/serialize/visitors/heading.ts
function visitHeading(block, ctx, level) {
  const payload = block[block.type];
  const isToggleable = payload && typeof payload === "object" && payload.is_toggleable;
  const prefix = isToggleable ? "\u25B6" + "#".repeat(level) : "#".repeat(level);
  const md = blockRichTextToMd(block);
  const color = colorSuffix(block);
  const line = `${prefix} ${md}${color}`.trimEnd();
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  return [line, ...childLines];
}

// src/serialize/visitors/list-item.ts
function visitBulletedList(block, ctx) {
  const md = blockRichTextToMd(block);
  const color = colorSuffix(block);
  const line = `- ${md}${color}`.trimEnd();
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  return [line, ...childLines];
}
function visitNumberedList(block, ctx) {
  const md = blockRichTextToMd(block);
  const color = colorSuffix(block);
  const line = `1. ${md}${color}`.trimEnd();
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  return [line, ...childLines];
}
function visitToDo(block, ctx) {
  const payload = block[block.type];
  const checked = payload && typeof payload === "object" && payload.checked;
  const box = checked ? "[x]" : "[ ]";
  const md = blockRichTextToMd(block);
  const color = colorSuffix(block);
  const line = `- ${box} ${md}${color}`.trimEnd();
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  return [line, ...childLines];
}

// src/serialize/visitors/quote.ts
function visitQuote(block, ctx) {
  const md = blockRichTextToMd(block);
  const color = colorSuffix(block);
  const line = `> ${md}${color}`.trimEnd();
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  return [line, ...childLines];
}

// src/serialize/visitors/divider.ts
function visitDivider(_block, _ctx) {
  return ["---"];
}

// src/serialize/visitors/code.ts
function visitCode(block, ctx) {
  const payload = block[block.type];
  const lang = payload && typeof payload === "object" && payload.language || "";
  const richText = getBlockRichText(block);
  const content = richText.map((r) => r.plain_text ?? r.text?.content ?? "").join("");
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  const lines = ["```" + lang, ...content.split("\n"), "```"];
  return [...lines, ...childLines];
}

// src/serialize/visitors/equation.ts
function visitEquation(block, _ctx) {
  const payload = block[block.type];
  const expr = payload && typeof payload === "object" && payload.expression || "";
  return [`$$ ${expr} $$`];
}

// src/serialize/visitors/image.ts
function getImageUrl(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  const p = payload;
  return p.file?.url ?? p.external?.url ?? "";
}
function getImageCaption(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  const cap = payload.caption;
  if (!Array.isArray(cap) || cap.length === 0) return "";
  return cap.map((c) => c.plain_text ?? "").join("");
}
function visitImage(block, _ctx) {
  const url = getImageUrl(block);
  const caption = getImageCaption(block);
  const alt = caption || "image";
  if (!url) return [];
  return [`![${alt}](${url})`];
}

// src/serialize/visitors/toggle.ts
var TOGGLE_PREFIX = "\u25B6";
function visitToggle(block, ctx) {
  const md = blockRichTextToMd(block);
  const color = colorSuffix(block);
  const line = `${TOGGLE_PREFIX} ${md}${color}`.trimEnd();
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  return [line, ...childLines];
}

// src/serialize/visitors/callout.ts
function attr(key, value) {
  return value !== void 0 && value !== "" ? ` ${key}="${value}"` : "";
}
function visitCallout(block, ctx) {
  const payload = block[block.type];
  const p = payload && typeof payload === "object" ? payload : {};
  const icon = p.icon?.emoji ?? "";
  const color = normalizeNotionColor(p.color);
  const md = blockRichTextToMd(block);
  const open = `<callout${attr("icon", icon)}${color !== "default" ? attr("color", color) : ""}>`;
  const close = "</callout>";
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  return [open + md + close, ...childLines];
}

// src/serialize/visitors/bookmark.ts
function getBookmarkUrl(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  return payload.url ?? "";
}
function getBookmarkCaption(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  const cap = payload.caption;
  if (!Array.isArray(cap) || cap.length === 0) return "";
  return cap.map((c) => c.plain_text ?? "").join("");
}
function visitBookmark(block, _ctx) {
  const url = getBookmarkUrl(block);
  const caption = getBookmarkCaption(block);
  if (!url) return [];
  return [`<bookmark url="${url}">${caption}</bookmark>`];
}

// src/serialize/visitors/embed.ts
function getEmbedUrl(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  return payload.url ?? "";
}
function getEmbedCaption(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  const cap = payload.caption;
  if (!Array.isArray(cap) || cap.length === 0) return "";
  return cap.map((c) => c.plain_text ?? "").join("");
}
function visitEmbed(block, _ctx) {
  const url = getEmbedUrl(block);
  const caption = getEmbedCaption(block);
  if (!url) return [];
  return [`<embed url="${url}">${caption}</embed>`];
}

// src/serialize/visitors/table.ts
function getTablePayload(block) {
  const payload = block[block.type];
  return payload && typeof payload === "object" ? payload : null;
}
function visitTable(block, ctx) {
  const payload = getTablePayload(block);
  if (!payload) return [];
  const children = payload.children ?? [];
  const tableBlocks = Array.isArray(children) ? children : [];
  const attrs = [];
  if (payload.has_column_header !== void 0) attrs.push(`header-row="${payload.has_column_header}"`);
  if (payload.has_row_header !== void 0) attrs.push(`header-column="${payload.has_row_header}"`);
  const attrStr = attrs.length ? " " + attrs.join(" ") : "";
  const lines = [`<table${attrStr}>`];
  for (const rowBlock of tableBlocks) {
    if (rowBlock.type !== "table_row") continue;
    const rowPayload = rowBlock[rowBlock.type];
    const cells = (rowPayload && typeof rowPayload === "object" && rowPayload.cells) ?? [];
    const cellParts = cells.map((cell) => {
      const rt = Array.isArray(cell?.rich_text) ? cell.rich_text : [];
      const md = richTextToInlineMarkdown(rt);
      return `<td>${md}</td>`;
    });
    lines.push("<tr>" + cellParts.join("") + "</tr>");
  }
  lines.push("</table>");
  return lines;
}

// src/serialize/visitors/column-list.ts
function visitColumnList(block, ctx) {
  const children = getBlockChildren(block);
  const columnBlocks = children.filter((b) => b.type === "column");
  const lines = ["<column_list>"];
  for (const col of columnBlocks) {
    const payload = col[col.type];
    const ratio = (payload && typeof payload === "object" && payload.width_ratio) ?? 0.5;
    const colChildren = (payload && typeof payload === "object" && payload.children) ?? [];
    lines.push(`<column width_ratio="${ratio}">`);
    if (colChildren.length) lines.push(...ctx.visitChildren(colChildren));
    lines.push("</column>");
  }
  lines.push("</column_list>");
  return lines;
}

// src/serialize/visitors/synced-block.ts
function getSyncedFrom(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return void 0;
  return payload.synced_from?.block_id;
}
function visitSyncedBlock(block, ctx) {
  const syncedFrom = getSyncedFrom(block);
  if (syncedFrom) return [`<synced_block synced_from="${syncedFrom}"/>`];
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  return ['<synced_block url="notion://synced_block/original_block_id">', ...childLines, "</synced_block>"];
}

// src/serialize/visitors/child-page.ts
function getChildPageTitle(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  return payload.title ?? "";
}
function visitChildPage(block, _ctx) {
  const payload = block[block.type];
  const url = (payload && typeof payload === "object" && payload.url) ?? "";
  const title = getChildPageTitle(block);
  if (!url) return [];
  return [`<page url="${url}">${title}</page>`];
}

// src/serialize/visitors/child-database.ts
function getDatabaseTitle(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  return payload.title ?? "";
}
function visitChildDatabase(block, _ctx) {
  const payload = block[block.type];
  const url = (payload && typeof payload === "object" && payload.url) ?? "";
  const title = getDatabaseTitle(block);
  if (!url) return [];
  return [`<database url="${url}">${title}</database>`];
}

// src/serialize/visitors/table-of-contents.ts
function visitTableOfContents(block, _ctx) {
  const color = getBlockColor(block);
  const c = normalizeNotionColor(color);
  const attr2 = c !== "default" ? ` color="${c}"` : "";
  return [`<table_of_contents${attr2}/>`];
}

// src/serialize/visitors/breadcrumb.ts
function visitBreadcrumb(_block, _ctx) {
  return ["<breadcrumb/>"];
}

// src/serialize/visitors/link-preview.ts
function getLinkPreviewUrl(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  return payload.url ?? "";
}
function visitLinkPreview(block, _ctx) {
  const url = getLinkPreviewUrl(block);
  if (!url) return [];
  return [`<link_preview url="${url}"/>`];
}

// src/serialize/visitors/video.ts
function getMediaUrl(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  const p = payload;
  return p.file?.url ?? p.external?.url ?? "";
}
function getMediaCaption(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  const cap = payload.caption;
  if (!Array.isArray(cap) || cap.length === 0) return "";
  return cap.map((c) => c.plain_text ?? "").join("");
}
function visitVideo(block, _ctx) {
  const url = getMediaUrl(block);
  const caption = getMediaCaption(block);
  if (!url) return [];
  return [`<video url="${url}">${caption}</video>`];
}

// src/serialize/visitors/audio.ts
function getMediaUrl2(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  const p = payload;
  return p.file?.url ?? p.external?.url ?? "";
}
function getMediaCaption2(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  const cap = payload.caption;
  if (!Array.isArray(cap) || cap.length === 0) return "";
  return cap.map((c) => c.plain_text ?? "").join("");
}
function visitAudio(block, _ctx) {
  const url = getMediaUrl2(block);
  const caption = getMediaCaption2(block);
  if (!url) return [];
  return [`<audio url="${url}">${caption}</audio>`];
}

// src/serialize/visitors/file.ts
function getMediaUrl3(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  const p = payload;
  return p.file?.url ?? p.external?.url ?? "";
}
function getMediaCaption3(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  const cap = payload.caption;
  if (!Array.isArray(cap) || cap.length === 0) return "";
  return cap.map((c) => c.plain_text ?? "").join("");
}
function visitFile(block, _ctx) {
  const url = getMediaUrl3(block);
  const caption = getMediaCaption3(block);
  if (!url) return [];
  return [`<file url="${url}">${caption}</file>`];
}

// src/serialize/visitors/pdf.ts
function getPdfUrl(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  const p = payload;
  return p.file?.url ?? p.external?.url ?? "";
}
function getPdfCaption(block) {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return "";
  const cap = payload.caption;
  if (!Array.isArray(cap) || cap.length === 0) return "";
  return cap.map((c) => c.plain_text ?? "").join("");
}
function visitPdf(block, _ctx) {
  const url = getPdfUrl(block);
  const caption = getPdfCaption(block);
  if (!url) return [];
  return [`<pdf url="${url}">${caption}</pdf>`];
}

// src/serialize/visitors/unknown.ts
function visitUnknown(block, ctx) {
  const behavior = ctx.options.unknownBlockBehavior;
  if (behavior === "omit") return [];
  if (behavior === "comment") {
    return [`<!-- unknown block type: ${block.type} -->`];
  }
  const id = block.id ? ` url="https://notion.so/..." alt="${block.type}"` : ` alt="${block.type}"`;
  return [`<unknown${id}/>`];
}

// src/serialize/visitors/index.ts
var VISITORS = {
  paragraph: visitParagraph,
  heading_1: (b, ctx) => visitHeading(b, ctx, 1),
  heading_2: (b, ctx) => visitHeading(b, ctx, 2),
  heading_3: (b, ctx) => visitHeading(b, ctx, 3),
  bulleted_list_item: visitBulletedList,
  numbered_list_item: visitNumberedList,
  to_do: visitToDo,
  quote: visitQuote,
  divider: visitDivider,
  code: visitCode,
  equation: visitEquation,
  image: visitImage,
  toggle: visitToggle,
  callout: visitCallout,
  bookmark: visitBookmark,
  embed: visitEmbed,
  video: visitVideo,
  audio: visitAudio,
  file: visitFile,
  pdf: visitPdf,
  table: visitTable,
  column_list: visitColumnList,
  synced_block: visitSyncedBlock,
  child_page: visitChildPage,
  child_database: visitChildDatabase,
  table_of_contents: visitTableOfContents,
  breadcrumb: visitBreadcrumb,
  link_preview: visitLinkPreview
};
function getVisitor(type) {
  return VISITORS[type];
}

// src/serialize/index-impl.ts
function notionBlocksToMarkdown(blocks, options) {
  const opts = {
    unknownBlockBehavior: options?.unknownBlockBehavior ?? "placeholder",
    includeBlockIds: options?.includeBlockIds ?? false
  };
  const lines = visitBlocks(blocks, 0, opts);
  return lines.join("\n");
}
function visitBlocks(blocks, depth, options) {
  const lines = [];
  const tabs = tabsForDepth(depth);
  const ctx = {
    depth,
    tabs,
    options,
    visitChildren(children) {
      return visitBlocks(children, depth + 1, options);
    }
  };
  for (const block of blocks) {
    if (options.includeBlockIds && block.id) {
      lines.push(tabs + `<!-- block-id: ${block.id} -->`);
    }
    const visitor = getVisitor(block.type);
    const blockLines = visitor ? visitor(block, ctx) : visitUnknown(block, ctx);
    for (const line of blockLines) {
      const isChildLine = line.startsWith("	");
      lines.push(line ? isChildLine ? line : tabs + line : line);
    }
  }
  return lines;
}

// src/deserialize/tokenizer.ts
var COLOR_ATTR_RE = /\s*\{color="([^"]*)"\}\s*$/;
function stripColor(line) {
  const m = line.match(COLOR_ATTR_RE);
  if (!m) return { content: line.trimEnd() };
  return { content: line.slice(0, line.length - m[0].length).trimEnd(), color: m[1] || void 0 };
}
var TOGGLE_PREFIX2 = "\u25B6";
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
    if (trimmed.startsWith(TOGGLE_PREFIX2)) {
      const after = trimmed.slice(TOGGLE_PREFIX2.length).trim();
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

// src/deserialize/rich-text-defaults.ts
var DEFAULT_ANNOTATIONS2 = {
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
  return { ...DEFAULT_ANNOTATIONS2 };
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
exports.notionBlocksToMarkdown = notionBlocksToMarkdown;
exports.richTextToInlineMarkdown = richTextToInlineMarkdown;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map