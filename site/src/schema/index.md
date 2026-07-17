---
layout: layouts/doc.njk
title: "Schema overview"
section: schema
permalink: /schema/index.html
---

# Schema overview

The schema is the heart of JinnTap. A single JSON file declares which XML elements the
editor understands, how each maps to a ProseMirror node or mark, and the toolbar
buttons, keyboard shortcuts and input rules that create them. Customising the editor is
mostly a matter of editing this file.

JinnTap ships two built-in schemas, chosen by the
[`format`](/api/attributes#format) attribute:

| Format | Attribute | Built-in file |
| --- | --- | --- |
| **TEI** (default) | `format="tei"` or omitted | [`src/schema.json`](https://github.com/JinnElements/jinn-tap/blob/main/src/schema.json) |
| **JATS** | `format="jats"` | [`src/jats-schema.json`](https://github.com/JinnElements/jinn-tap/blob/main/src/jats-schema.json) |

To replace the built-in schema for the active format, point the
[`schema` attribute](/api/attributes#schema) at a URL:

```html
<jinn-tap format="tei" schema="./my-schema.json"></jinn-tap>
```

## Top-level structure

```jsonc
{
  "attributes": { /* attributes available on every element */ },
  "toolbar":    { /* global toolbar buttons (not tied to one element) */ },
  "selects":    { /* dropdown groups that toolbar buttons can belong to */ },
  "schema":     { /* the element definitions — the bulk of the file */ }
}
```

| Key | Purpose | Reference |
| --- | --- | --- |
| `attributes` | Attributes offered on **every** element (e.g. `rend`, `id`) | [Attributes](/schema/attributes#global-attributes) |
| `toolbar` | Global toolbar buttons — snippets, mode toggles, structural commands | [Toolbar & selects](/schema/toolbar) |
| `selects` | Named dropdown groups the toolbar buttons can be filed under | [Toolbar & selects](/schema/toolbar#selects) |
| `schema` | One entry per XML element, keyed by element name | [Element definitions](/schema/elements) |

## An element entry at a glance

Each entry under `schema` maps an XML element name to an editor node/mark:

```jsonc
"hi": {
  "type": "inline",                       // → a ProseMirror mark
  "attributes": {                         // attributes + their value types
    "rend": { "type": "string", "default": "i", "enum": ["i", "b", "u", "code"] }
  },
  "keyboard": {                           // shortcuts that toggle it
    "Cmd-b": { "attributes": { "rend": "b" } }
  },
  "toolbar": {                            // toolbar buttons that create it
    "Bold": { "attributes": { "rend": "b" }, "label": "<i class='bi bi-type-bold'></i>", "order": 5 }
  }
}
```

## Read next

- [Node types](/schema/node-types) — the `type` values and what each becomes
- [Element definitions](/schema/elements) — every property of an entry, with the full element catalog
- [Attributes & connectors](/schema/attributes) — value types, defaults, enums, authority lookups
- [Toolbar & selects](/schema/toolbar)
- [Keyboard & input rules](/schema/keyboard-and-input-rules)
- [Conditional types](/schema/conditional-types) — one tag, several node types
- [Unknown elements](/schema/unknown-elements) — what happens to markup not in the schema
- [Adding a format](/schema/adding-a-format) — support another XML dialect beyond TEI/JATS
