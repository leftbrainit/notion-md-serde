## Context

The package spec (`notion-flavored-markdown-serde-spec.md`) defines a standalone TypeScript library for bidirectional conversion between Notion-flavored Markdown and Notion API block JSON. There is no existing codebase; this is a greenfield implementation. Constraints: zero runtime Notion/MCP dependencies, spec-faithful output, deterministic serialization for selection-matching use cases, tree-shakeable and isomorphic (Node, Deno, browser, edge). Stakeholders are any consumer needing markdown ↔ block conversion (editors, migrations, CLIs, edge functions).

## Goals / Non-Goals

**Goals:**

- Implement the full public API (notionBlocksToMarkdown, markdownToNotionBlocks, richTextToInlineMarkdown, inlineMarkdownToRichText) with exported types and options.
- Implement the Notion-flavored Markdown specification: all block types (standard, toggle, XML), inline formatting, colors, tab indentation, escaping, empty-block.
- Achieve round-trip fidelity: parse(serialize(blocks)) functionally equivalent to blocks.
- Deterministic serialization (attribute order, whitespace, escaping).
- Optional Notion API limit enforcement (e.g. 2000 chars per rich text element).
- Module layout that supports tree-shaking and clear separation: types, serialize, deserialize, utils.

**Non-Goals:**

- Database properties serialization, Notion API calls, file uploads, real-time collaboration, selection matching, page-level metadata, template blocks, comments (all out of scope per spec Section 10).

## Decisions

### Module structure

- **Decision:** Use the spec’s suggested layout: `src/index.ts`, `src/types.ts`, `src/serialize/` (index, visitors per block type, rich-text), `src/deserialize/` (index, tokenizer, parser, emitters, rich-text), `src/utils/` (colors, escaping, indentation).
- **Rationale:** Keeps serialize vs deserialize clearly separated, one visitor per block type for maintainability, shared rich-text and utils reused by both pipelines.
- **Alternatives:** Single large serializer/deserializer file (rejected: hard to maintain); unified “convert” module (rejected: spec and proposal separate serialize and deserialize).

### Serializer: visitor pattern and indentation

- **Decision:** Implement a block visitor that walks the block tree; each block type has a dedicated visitor that emits markdown and recurses into children with an incremented indentation level (tab-based). Indentation is passed through context; each line of a block (including multi-line code blocks) is prefixed with the current tab string.
- **Rationale:** Matches spec Section 4.1 and 8.2; makes adding new block types a single file; deterministic because indentation is computed from depth only.
- **Alternatives:** Single switch over block type in one file (rejected: would become huge); emitting raw strings without indentation context (rejected: would break nesting).

### Deserializer: line-level tokenizer first

- **Decision:** Use a line-level tokenizer that emits typed tokens (heading, paragraph, list, toggle, quote, divider, code/equation start-content-end, XML open/close/self-closing, image, empty_block, indent increase/decrease). Then a second phase builds the block tree from token stream + indentation and maps to Notion blocks.
- **Rationale:** Spec Section 9.1 recommends this over a full markdown AST because tab indentation and XML/toggle/color syntax are non-standard; line-level keeps control over tabs and custom syntax.
- **Alternatives:** Full unified markdown parser (e.g. remark-parse) with plugins (rejected: tab semantics and XML/toggle need custom handling); character-by-character parser (rejected: more complex than line-level for this spec).

### Rich text: shared serialize/deserialize

- **Decision:** Implement `richTextToInlineMarkdown` and `inlineMarkdownToRichText` in dedicated modules (`serialize/rich-text.ts`, `deserialize/rich-text.ts` or a shared `rich-text.ts` with both directions). Block visitors and deserializer emitters call into these for any rich text content.
- **Rationale:** Single place for annotation order, escaping, mention/equation tags, and limit-splitting logic; avoids duplication and keeps spec Section 5.6/5.7/8.3/9.3 in one conceptual layer.
- **Alternatives:** Inlining rich-text logic in each visitor/emitter (rejected: duplication and risk of inconsistency).

### Types: Notion-compatible without @notionhq/client

- **Decision:** Define and export our own interfaces (`NotionBlock`, `NotionRichText`, `NotionAnnotations`, `NotionColor`, etc.) that mirror the Notion API. Do not depend on `@notionhq/client` at runtime.
- **Rationale:** Spec Section 3.2 requires API compatibility for consumers who may pass API responses into the library; zero runtime dependency keeps the package standalone and tree-shakeable.
- **Alternatives:** Depending on @notionhq/client for types (rejected: adds runtime dependency); using `any` for blocks (rejected: poor DX and type safety).

### Build and entry points

- **Decision:** Use tsup (or unbuild) for ESM + CJS dual output; export types from `dist/`; support optional subpath exports (e.g. `./serialize`, `./deserialize`) as in spec Section 12.
- **Rationale:** Spec requires isomorphic and tree-shakeable; dual output and subpaths support both modern and legacy consumers.
- **Alternatives:** ESM-only (rejected: spec says CJS support); single entry only (rejected: spec shows subpath exports).

### Testing strategy

- **Decision:** Vitest with: (1) round-trip tests (blocks → markdown → blocks, assert functional equivalence); (2) snapshot tests per block type (paired JSON + expected markdown in `__snapshots__/` or equivalent); (3) property-based tests (e.g. fast-check) for invariants (length, types, nesting, colors); (4) edge-case tests (empty block, long rich text, deep nesting, tables with colors, backslash escapes, etc.).
- **Rationale:** Aligns with spec Section 7; round-trip and snapshots give confidence in spec compliance; property-based tests catch regressions on structure and limits.
- **Alternatives:** Only unit tests per function (rejected: insufficient for round-trip); no property-based (rejected: spec explicitly recommends it).

## Risks / Trade-offs

- **Risk:** Notion’s exact markdown output is not formally published; our serializer may differ in edge cases (attribute order, whitespace).  
  **Mitigation:** Document deterministic rules (attribute order, no trailing space); build test corpus from real MCP fetch output where possible; snapshot tests lock in current behavior.

- **Risk:** Line-level tokenizer may be tricky for multi-line XML (e.g. table with many rows) or nested tags.  
  **Mitigation:** Define clear token boundaries (open/close tags, indent); add focused tests for tables, column_list, synced_block; consider a small state machine for tag matching.

- **Risk:** Inline rich text parsing (bold/italic/code/links/equations/mentions) can be ambiguous (e.g. `***` bold vs italic).  
  **Mitigation:** Follow a fixed precedence and spec rules (e.g. escape first, then code, then bold/italic/strike/underline, then link/equation/mention); add tests for combinations and edge cases from spec 5.7 and 7.4.

- **Trade-off:** Supporting both strict and lenient deserialize increases code paths and test matrix.  
  **Acceptance:** Keep strict as the primary path; lenient as a thin fallback (e.g. unknown → paragraph) to improve robustness for standard markdown input.

## Migration Plan

- N/A (new package). “Migration” is initial release: implement per tasks, add tests and snapshots, publish package with entry points and types. No rollback of existing behavior.

## Open Questions

- Inline colored text: spec 5.6 says “TBD / may use a span-like syntax.” Decide before implementation whether v1 will support inline color in markdown and, if so, exact syntax (e.g. `<span color="red">` or `{color="red"}text`) so serialize/deserialize and rich-text specs can be updated if needed.
- GFM tables: spec 9.4 says “GFM tables → Notion table blocks (with `<table>` structure internally).” Confirm whether deserializer must accept standard GFM pipe tables and convert to Notion table blocks, or whether v1 only accepts the XML `<table>` form; this affects tokenizer and emitter scope.
