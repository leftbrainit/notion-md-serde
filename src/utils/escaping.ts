/**
 * Characters that must be escaped in markdown when they could start syntax.
 * Backslash before them renders as literal.
 */
const MARKDOWN_ESCAPE_RE = /\\([*_~`#\[\]()\\<>$])/g;
const CHARS_TO_ESCAPE_IN_MD = /([*_~`#\[\]()\\<>$])/g;

/**
 * Escape special markdown characters so they render as literals.
 * Used when serializing rich text to inline markdown.
 */
export function escapeForMarkdown(s: string): string {
  return s.replace(CHARS_TO_ESCAPE_IN_MD, "\\$1");
}

/**
 * Unescape backslash-escaped characters in markdown content.
 * Used when parsing inline markdown (e.g. \* → *).
 */
export function unescapeMarkdown(s: string): string {
  return s.replace(MARKDOWN_ESCAPE_RE, "$1");
}
