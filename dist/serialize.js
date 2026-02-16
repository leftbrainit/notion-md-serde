// src/utils/indentation.ts
function tabsForDepth(depth) {
  return "	".repeat(Math.max(0, depth));
}

// src/utils/escaping.ts
var CHARS_TO_ESCAPE_IN_MD = /([*_~`#\[\]()\\<>$])/g;
function escapeForMarkdown(s) {
  return s.replace(CHARS_TO_ESCAPE_IN_MD, "\\$1");
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

export { notionBlocksToMarkdown, richTextToInlineMarkdown };
//# sourceMappingURL=serialize.js.map
//# sourceMappingURL=serialize.js.map