---
layout: layouts/doc.njk
title: "Adding a format"
section: schema
permalink: /schema/adding-a-format/index.html
---

# Adding a format

JinnTap ships with three dialects — TEI, JATS, and DocBook — selected by the
[`format`](/api/attributes#format) attribute. Supporting another XML dialect means
teaching the editor three things: how to wrap and prefix the document, which
[schema JSON](/schema/) to load by default, and how to convert between that dialect’s
XML and the editor’s HTML custom elements.

Use TEI (`src/util/module-tei.xq`, `src/tei-schema.json`), JATS
(`src/util/module-jats.xq`, `src/jats-schema.json`), and DocBook
(`src/util/module-docbook.xq`, `src/docbook-schema.json`) as templates. The checklist
below walks through the steps using a hypothetical fourth format.

## 1. Register the format config

Add an entry in
[`src/util/xml-formats.js`](https://github.com/JinnElements/jinn-tap/blob/main/src/util/xml-formats.js)
and register it in `FORMATS`:

```js
export const MY_FORMAT = {
  namespace: 'http://example.org/ns',
  rootElement: 'doc',
  bodyWrapper: 'body',                 // fragment wrapper used on export
  prefix: 'my-',                       // HTML custom elements: <my-sec>, …
  notesWrapper: 'notes',               // or null if the dialect has no footnote bag
  noteName: 'note',                    // or null
  anchorName: 'ref',                   // or null
  linkDirection: 'anchor-to-note',     // or 'note-to-anchor'
  mapIdToXmlId: true,
  newDocumentTemplate: () => `<doc xmlns="http://example.org/ns">
    <body><sec><p/></sec></body>
  </doc>`,
};

export const FORMATS = {
  tei: TEI_FORMAT,
  jats: JATS_FORMAT,
  docbook: DOCBOOK_FORMAT,
  myformat: MY_FORMAT,
};
```

| Field | Role |
| --- | --- |
| `namespace` | Written onto the body wrapper on export when non-empty |
| `prefix` | Prefix for editor custom elements (`tei-`, `jats-`, `db-`, …) |
| `bodyWrapper` | Element that wraps the editable fragment during export |
| `notesWrapper` / `noteName` / `anchorName` | Footnote plumbing; DocBook uses `footnotes` / `footnote` / `footnoteref` (inline in XML, standoff in the editor) |
| `linkDirection` | `note-to-anchor` (note points at anchor) or `anchor-to-note` (anchor points at note) |
| `mapIdToXmlId` | Emit editor `@id` as `xml:id` on serialize (TEI, DocBook) or plain `id` (JATS) |
| `newDocumentTemplate` | Skeleton used when creating an empty document |

`getFormat(formatId)` must return your config; unknown ids currently fall back to TEI.

## 2. Add a built-in schema

1. Create `src/my-schema.json` — same top-level shape as
   [`src/tei-schema.json`](https://github.com/JinnElements/jinn-tap/blob/main/src/tei-schema.json)
   (`css`, `attributes`, `toolbar`, `selects`, `schema`).
2. Import it in
   [`src/jinn-tap.js`](https://github.com/JinnElements/jinn-tap/blob/main/src/jinn-tap.js)
   and add it to the `DEFAULT_SCHEMAS` map so your format selects it.

Hosts can still override the built-in with the
[`schema`](/api/attributes#schema) attribute; the format still controls prefix and
import/export.

## 3. Implement the XQuery I/O module

XML round-tripping is done by fontoxpath modules registered in
[`src/util/xml.js`](https://github.com/JinnElements/jinn-tap/blob/main/src/util/xml.js).
Each format needs its own module namespace URI so the correct transform is selected.

1. Create `src/util/module-my.xq` with `jt:new-document`, `jt:import`, and `jt:export`
   under a unique module namespace (see `module-docbook.xq` for a recent example).
2. In `xml.js`: import/register the module and extend `MODULE_NAMESPACES`.

**Import** must turn dialect XML into HTML custom elements using your `prefix`,
strip or relocate non-editable chrome (headers, `info`, …), and place footnotes
where the editor expects them (if any).

**Export** receives the serialized editor fragment (unprefixed XML local names),
merges it back into the original document (`$input`), and restores the dialect
namespace / wrappers.

## 4. Stylesheet via schema `css`

Point the schema at a stylesheet with a top-level `css` property. Built-in examples:

- [`src/tei-editor-styles.css`](https://github.com/JinnElements/jinn-tap/blob/main/src/tei-editor-styles.css) — `tei-*`
- [`src/jats-editor-styles.css`](https://github.com/JinnElements/jinn-tap/blob/main/src/jats-editor-styles.css) — `jats-*`
- [`src/docbook-editor-styles.css`](https://github.com/JinnElements/jinn-tap/blob/main/src/docbook-editor-styles.css) — `db-*`

Ship the CSS via `scripts/copy-assets.js` and `scripts/copy-site-assets.js`.

## 5. Smoke-test the pipeline

1. `<jinn-tap format="myformat"></jinn-tap>` — empty document from `jt:new-document()`.
2. Load a real sample with `url` or `.xml = …` — import must produce prefixed
   elements that match your schema.
3. Edit, then read `.xml` — export must restore a valid document.
4. Optional: footnotes — verify `notesWrapper` / `linkDirection` (or confirm
   `noteName: null` skips footnote plumbing when the dialect has none).

## What you do *not* need to change

- ProseMirror node/mark type machinery (`createFromSchema`) — it already takes
  `prefix` and footnote options from the format config.
- Serialization of editor → fragment XML (`src/util/serialize.js`) — it emits local
  names; the XQuery **export** step reattaches dialect structure and namespaces.
- Unknown-element synthesis — works for any prefix once `format.prefix` is set.
