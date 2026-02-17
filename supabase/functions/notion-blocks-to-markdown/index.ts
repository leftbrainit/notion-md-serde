// Supabase Edge Function: converts an array of Notion blocks (with optional nested
// children) to Markdown using notion-md-serde.
//
// Request body: JSON with "blocks" array, e.g.:
//   { "blocks": [ { "type": "heading_1", "heading_1": { "rich_text": [...] } }, ... ] }
// Blocks may have top-level "children" or children inside the type payload; both are normalized.
//
// Response: { "markdown": "..." }

// @deno-types="https://esm.sh/notion-md-serde@0.1.2/dist/index.d.ts"
import { notionBlocksToMarkdown } from "https://esm.sh/notion-md-serde@0.1.2";

interface BlockInput {
  type: string;
  id?: string;
  children?: BlockInput[];
  [key: string]: unknown;
}

/** Recursively normalize blocks so children live in the type payload (block[type].children). */
function normalizeBlocks(blocks: BlockInput[]): BlockInput[] {
  return blocks.map((block) => {
    const { type, children: topChildren, ...rest } = block;
    const payload = (rest[type] ?? {}) as Record<string, unknown>;
    const payloadChildren = payload.children as BlockInput[] | undefined;
    const mergedChildren = Array.isArray(topChildren)
      ? topChildren
      : Array.isArray(payloadChildren)
        ? payloadChildren
        : undefined;

    const normalized: BlockInput = {
      type,
      ...rest,
      [type]: {
        ...payload,
        ...(mergedChildren
          ? { children: normalizeBlocks(mergedChildren) }
          : {}),
      },
    };
    return normalized;
  });
}

/** Recursively strip image blocks from the tree (their signed URLs expire quickly). */
function stripImages(blocks: BlockInput[]): BlockInput[] {
  return blocks
    .filter((b) => b.type !== "image")
    .map((block) => {
      const payload = block[block.type] as Record<string, unknown> | undefined;
      if (payload && Array.isArray(payload.children)) {
        return {
          ...block,
          [block.type]: { ...payload, children: stripImages(payload.children as BlockInput[]) },
        };
      }
      return block;
    });
}

function parseBody(body: string): BlockInput[] {
  const parsed = JSON.parse(body) as unknown;
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { blocks?: BlockInput[] }).blocks)) {
    return (parsed as { blocks: BlockInput[] }).blocks;
  }
  throw new Error("Body must be a JSON array of blocks or an object with a 'blocks' array.");
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed. Use POST with a JSON body." },
      { status: 405 }
    );
  }

  try {
    const body = await req.text();
    if (!body?.trim()) {
      return Response.json(
        { error: "Request body is required (JSON array of blocks or { blocks: [...] })." },
        { status: 400 }
      );
    }

    const blocks = parseBody(body);
    const normalized = normalizeBlocks(blocks);
    const cleaned = stripImages(normalized);
    const markdown = notionBlocksToMarkdown(cleaned);

    return Response.json(
      { markdown },
      {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "Failed to convert blocks to markdown.", details: message },
      { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
});
