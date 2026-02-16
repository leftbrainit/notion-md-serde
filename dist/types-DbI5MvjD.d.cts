/**
 * Notion API–compatible types. No runtime dependency on @notionhq/client.
 */
type NotionColor = "default" | "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red" | "gray_background" | "brown_background" | "orange_background" | "yellow_background" | "green_background" | "blue_background" | "purple_background" | "pink_background" | "red_background";
interface NotionAnnotations {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: NotionColor;
}
type NotionMention = {
    type: "page";
    page: {
        id: string;
    };
} | {
    type: "database";
    database: {
        id: string;
    };
} | {
    type: "user";
    user: {
        id: string;
    };
} | {
    type: "date";
    date: {
        start: string;
        end?: string | null;
    };
};
interface NotionRichText {
    type: "text" | "mention" | "equation";
    text?: {
        content: string;
        link?: {
            url: string;
        } | null;
    };
    mention?: NotionMention;
    equation?: {
        expression: string;
    };
    annotations?: NotionAnnotations;
    plain_text?: string;
    href?: string | null;
}
interface NotionBlock {
    type: string;
    id?: string;
    [key: string]: unknown;
}
interface SerializeOptions {
    /** How to handle block types not in the spec. Default: 'placeholder' */
    unknownBlockBehavior?: "omit" | "comment" | "placeholder";
    /** Include Notion block IDs as HTML comments. Default: false */
    includeBlockIds?: boolean;
}
interface DeserializeOptions {
    /** Strict mode fails on unknown syntax; lenient passes through as paragraphs. Default: false */
    strict?: boolean;
    /** Auto-split rich text exceeding 2000 chars per element. Default: false */
    enforceNotionLimits?: boolean;
}

export type { DeserializeOptions as D, NotionAnnotations as N, SerializeOptions as S, NotionBlock as a, NotionColor as b, NotionMention as c, NotionRichText as d };
