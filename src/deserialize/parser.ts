import type { Token } from "./tokenizer";

export interface BlockNode {
  type: string;
  content?: string;
  color?: string;
  language?: string;
  checked?: boolean;
  level?: 1 | 2 | 3;
  toggleable?: boolean;
  alt?: string;
  url?: string;
  attributes?: Record<string, string>;
  children: BlockNode[];
}

export function parseToBlockTree(tokens: Token[]): BlockNode[] {
  const stack: { depth: number; node: BlockNode }[] = [];
  const roots: BlockNode[] = [];
  let codeContent: string[] = [];
  let equationContent: string[] = [];
  let codeLang = "";
  let codeDepth = 0;
  let equationDepth = 0;

  function flushCode(): BlockNode | null {
    if (codeContent.length === 0) return null;
    const node: BlockNode = { type: "code", content: codeContent.join("\n"), language: codeLang, children: [] };
    codeContent = [];
    return node;
  }
  function flushEquation(): BlockNode | null {
    if (equationContent.length === 0) return null;
    const node: BlockNode = { type: "equation", content: equationContent.join("\n"), children: [] };
    equationContent = [];
    return node;
  }

  function addBlock(depth: number, node: BlockNode): void {
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
        children: [],
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
