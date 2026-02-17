import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";
import { getBlockRichText, getBlockChildren } from "../block-helpers";

export function visitCode(block: NotionBlock, ctx: SerializeContext): string[] {
  const payload = block[block.type];
  const lang = (payload && typeof payload === "object" && (payload as { language?: string }).language) || "";
  const richText = getBlockRichText(block);
  const content = richText.map((r) => r.plain_text ?? r.text?.content ?? "").join("");
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  const lines = [
    `${ctx.indent}\`\`\`${lang}`,
    ...content.split("\n").map((l) => ctx.indent + l),
    `${ctx.indent}\`\`\``,
  ];
  return [...lines, ...childLines];
}
