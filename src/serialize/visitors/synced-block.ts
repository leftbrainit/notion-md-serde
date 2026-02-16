import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";
import { getBlockChildren } from "../block-helpers";

function getSyncedFrom(block: NotionBlock): string | undefined {
  const payload = block[block.type];
  if (!payload || typeof payload !== "object") return undefined;
  return (payload as { synced_from?: { block_id?: string } }).synced_from?.block_id;
}

export function visitSyncedBlock(block: NotionBlock, ctx: SerializeContext): string[] {
  const syncedFrom = getSyncedFrom(block);
  if (syncedFrom) return [`<synced_block synced_from="${syncedFrom}"/>`];
  const children = getBlockChildren(block);
  const childLines = children.length ? ctx.visitChildren(children) : [];
  return ['<synced_block url="notion://synced_block/original_block_id">', ...childLines, "</synced_block>"];
}
