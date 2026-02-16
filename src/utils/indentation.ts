/**
 * Tab-based nesting per Notion-flavored Markdown spec.
 * Spaces are NOT valid for block nesting; one level = one tab.
 */

/**
 * Returns a string of `depth` tab characters for prefixing lines at that nesting level.
 */
export function tabsForDepth(depth: number): string {
  return "\t".repeat(Math.max(0, depth));
}

/**
 * Returns the number of leading tabs on a line (indentation level).
 */
export function getIndentDepth(line: string): number {
  let i = 0;
  while (line[i] === "\t") i++;
  return i;
}

/**
 * Trims leading tabs from a line and returns the trimmed content and the indent depth.
 */
export function stripIndent(line: string): { content: string; depth: number } {
  const depth = getIndentDepth(line);
  return { content: line.slice(depth), depth };
}
