import type { NotionBlock } from "../../types";
import type { SerializeContext } from "../types";
import { visitParagraph } from "./paragraph";
import { visitHeading } from "./heading";
import { visitBulletedList } from "./list-item";
import { visitNumberedList } from "./list-item";
import { visitToDo } from "./list-item";
import { visitQuote } from "./quote";
import { visitDivider } from "./divider";
import { visitCode } from "./code";
import { visitEquation } from "./equation";
import { visitImage } from "./image";
import { visitToggle } from "./toggle";
import { visitCallout } from "./callout";
import { visitBookmark } from "./bookmark";
import { visitEmbed } from "./embed";
import { visitTable } from "./table";
import { visitColumnList } from "./column-list";
import { visitSyncedBlock } from "./synced-block";
import { visitChildPage } from "./child-page";
import { visitChildDatabase } from "./child-database";
import { visitTableOfContents } from "./table-of-contents";
import { visitBreadcrumb } from "./breadcrumb";
import { visitLinkPreview } from "./link-preview";
import { visitVideo } from "./video";
import { visitAudio } from "./audio";
import { visitFile } from "./file";
import { visitPdf } from "./pdf";
import { visitUnknown } from "./unknown";

const VISITORS: Record<string, (block: NotionBlock, ctx: SerializeContext) => string[]> = {
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
  link_preview: visitLinkPreview,
};

export function getVisitor(type: string): ((block: NotionBlock, ctx: SerializeContext) => string[]) | undefined {
  return VISITORS[type];
}

export { visitUnknown };
