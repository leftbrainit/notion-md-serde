# notion-blocks-to-markdown

Supabase Edge Function that converts an array of Notion blocks to Markdown using **notion-md-serde**.

## Request

- **Method:** `POST`
- **Content-Type:** `application/json`
- **Body:** Either:
  - A JSON array of Notion blocks, or
  - An object with a `blocks` key: `{ "blocks": [ ... ] }`

Blocks may include nested children in either form:

- Top-level: `{ "type": "paragraph", "paragraph": { ... }, "children": [ ... ] }`
- In payload: `{ "type": "paragraph", "paragraph": { "rich_text": [...], "children": [ ... ] } }`

Children can be nested arbitrarily deep; the function normalizes and recurses into them.

## Response

- **200:** `{ "markdown": "# Title\n\nHello **world**\n\n---" }`
- **400:** Invalid body or conversion error: `{ "error": "...", "details": "..." }`
- **405:** Non-POST request

## Example

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/notion-blocks-to-markdown" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <anon-key>" \
  -d '{
    "blocks": [
      {
        "type": "heading_1",
        "heading_1": {
          "rich_text": [{ "type": "text", "text": { "content": "My Page" }, "plain_text": "My Page" }]
        }
      },
      {
        "type": "paragraph",
        "paragraph": {
          "rich_text": [
            { "type": "text", "text": { "content": "Hello " }, "plain_text": "Hello " },
            {
              "type": "text",
              "text": { "content": "world" },
              "plain_text": "world",
              "annotations": { "bold": true, "italic": false, "strikethrough": false, "underline": false, "code": false, "color": "default" }
            }
          ]
        }
      },
      { "type": "divider", "divider": {} }
    ]
  }'
```

## Deploy

From the repo root (with [Supabase CLI](https://supabase.com/docs/guides/cli) and a linked project):

```bash
supabase functions deploy notion-blocks-to-markdown
```

## Dependency

The function imports **notion-md-serde** from [esm.sh](https://esm.sh) (`notion-md-serde@0.1.0`). Ensure the package is published to npm, or point the import to your built bundle URL for self-hosted use.
