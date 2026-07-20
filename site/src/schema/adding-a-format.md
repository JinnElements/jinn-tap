---
layout: layouts/doc.njk
title: "Adding a format"
section: schema
permalink: /schema/adding-a-format/index.html
---

# Adding a format

JinnTap ships with two dialects — TEI and JATS — selected by the
[`format`](/api/attributes#format) attribute. Supporting another XML dialect means
teaching the editor three things: how to wrap and prefix the document, which
[schema JSON](/schema/) to load by default, and how to convert between that dialect’s
XML and the editor’s HTML custom elements.

Use TEI (`src/util/module-tei.xq`, `src/tei-schema.json`) and JATS
(`src/util/module-jats.xq`, `src/jats-schema.json`) as templates. The checklist below
walks through adding **DocBook** as a third format (`format="docbook"`). DocBook is
not built in today — the snippets are illustrative only.

## 1. Register the format config

Add an entry in
[`src/util/xml-formats.js`](https://github.com/JinnElements/jinn-tap/blob/main/src/util/xml-formats.js)
and register it in `FORMATS`:

```js
export const DOCBOOK_FORMAT = {
  namespace: 'http://docbook.org/ns/docbook',
  rootElement: 'article',
  bodyWrapper: 'article',                 // fragment wrapper used on export
  prefix: 'db-',                          // HTML custom elements: <db-sect1>, …
  notesWrapper: 'bibliography',           // or a dedicated notes container in your schema
  noteName: 'footnote',
  anchorName: 'xref',
  linkDirection: 'anchor-to-note',        // xref points at footnote (cf. JATS)
  newDocumentTemplate: () => `<article xmlns="http://docbook.org/ns/docbook" version="5.0">
    <title>Untitled</title>
    <section>
      <title>Section</title>
      <para/>
    </section>
  </article>`,
};

export const FORMATS = {
  tei: TEI_FORMAT,
  jats: JATS_FORMAT,
  docbook: DOCBOOK_FORMAT,
};
```

| Field | Role |
| --- | --- |
| `namespace` | Written onto the body wrapper on export when non-empty |
| `prefix` | Prefix for editor custom elements (`tei-`, `jats-`, `db-`, …) |
| `bodyWrapper` | Element that wraps the editable fragment during export |
| `notesWrapper` / `noteName` / `anchorName` | Footnote plumbing passed into the editor extensions |
| `linkDirection` | `note-to-anchor` (note points at anchor) or `anchor-to-note` (anchor points at note) |
| `newDocumentTemplate` | Skeleton used when creating an empty document |

`getFormat(formatId)` must return your config; unknown ids currently fall back to TEI.
Exact note/xref wiring depends on how your dialect links footnotes — tune
`noteName`, `anchorName`, and `linkDirection` to match.

## 2. Add a built-in schema

1. Create `src/docbook-schema.json` — same top-level shape as
   [`src/tei-schema.json`](https://github.com/JinnElements/jinn-tap/blob/main/src/tei-schema.json)
   (`attributes`, `toolbar`, `selects`, `schema`). Element keys are DocBook **local
   names** (`section`, `para`, `emphasis`, `footnote`, …).
2. Import it in
   [`src/jinn-tap.js`](https://github.com/JinnElements/jinn-tap/blob/main/src/jinn-tap.js)
   and extend `getDefaultSchema()` / `updateSchemaForFormat()` so
   `format="docbook"` selects it (today those methods only special-case `jats`).

Hosts can still override the built-in with the
[`schema`](/api/attributes#schema) attribute; the format still controls prefix and
import/export.

## 3. Implement the XQuery I/O module

XML round-tripping is done by fontoxpath modules registered in
[`src/util/xml.js`](https://github.com/JinnElements/jinn-tap/blob/main/src/util/xml.js).
Each format needs its own module namespace URI so the correct transform is selected.

1. Create `src/util/module-docbook.xq` with:

   ```xquery
   module namespace jt = 'http://jinntec.de/jinntap/docbook';

   declare namespace db = 'http://docbook.org/ns/docbook';

   declare function jt:new-document() as node() { … };
   declare function jt:import($doc as node()) as node()* { … };
   declare function jt:export($nodes as node()*, $input as document-node(), $meta as map(*)) as node()* { … };
   ```

2. In `xml.js`:
   - `import docbookModule from './module-docbook.xq?raw'`
   - `registerXQueryModule(docbookModule)`
   - extend `getModuleNamespace('docbook')` to return that URI (and a distinct XQuery
     prefix for `moduleImports`)

**Import** must turn DocBook XML into HTML custom elements using your `prefix`
(e.g. `<section>` → `<db-section>`, `<para>` → `<db-para>`), strip or relocate
non-editable chrome (`info`, metadata), and place footnotes where the editor expects
them.

**Export** receives the serialized editor fragment (unprefixed XML local names),
merges it back into the original document (`$input`), and restores the DocBook
namespace / wrappers.

## 4. Stylesheet for the new prefix

Editor look-and-feel is prefix-specific:

- [`tei-editor-styles.css`](https://github.com/JinnElements/jinn-tap/blob/main/tei-editor-styles.css) — `tei-*`
- [`jats-editor-styles.css`](https://github.com/JinnElements/jinn-tap/blob/main/jats-editor-styles.css) — `jats-*`

Add e.g. `docbook-editor-styles.css` targeting `db-*` and load it beside the
component (the docs site copies JATS styles via `scripts/copy-site-assets.js`).

<aside class="callout callout-warning">
<strong>Debug colours</strong>
<code>src/util/colors.js</code> currently hard-codes the <code>tei-</code> prefix in
generated debug CSS. Other formats need a small change there if you rely on debug
mode for non-TEI markup.
</aside>

## 5. Smoke-test the pipeline

1. `<jinn-tap format="docbook"></jinn-tap>` — empty document from `jt:new-document()`.
2. Load a real DocBook sample with `url` or `.xml = …` — import must produce `db-*`
   elements that match your schema.
3. Edit, then read `.xml` — export must restore a valid DocBook document.
4. Optional: footnotes — verify `notesWrapper` / `linkDirection` against DocBook’s
   `footnote` / `xref` model.

## What you do *not* need to change

- ProseMirror node/mark type machinery (`createFromSchema`) — it already takes
  `prefix` and footnote options from the format config.
- Serialization of editor → fragment XML (`src/util/serialize.js`) — it emits local
  names; the XQuery **export** step reattaches dialect structure and namespaces.
- Unknown-element synthesis — works for any prefix once `format.prefix` is set.
