---
layout: layouts/doc.njk
title: "Properties"
section: api
permalink: /api/properties/index.html
---

# Properties

JavaScript properties on the `<jinn-tap>` element.

```js
const editor = document.querySelector('jinn-tap');
```

## `content`

- **get** — the editor's current text content.
- **set** — replace the document with an editor *fragment* in custom-element form.

```js
editor.content = '<tei-div><tei-p>New content</tei-p></tei-div>';
```

Setting `content` also synthesizes schema entries for any
[unknown elements](/schema/unknown-elements) in the fragment.

<aside class="callout"><strong>Getting XML back</strong>
<p>To read the document <em>as XML</em>, use the <a href="#xml"><code>xml</code></a> getter or the
<a href="{{ '/api/events/' | prefixUrl }}#content-change"><code>content-change</code></a> event's <code>body</code>/<code>xml</code> — the <code>content</code>
getter returns text, not serialized markup.</p>
</aside>

<h2 id="xml"><code>xml</code></h2>

- **get** — the full XML document (teiHeader/metadata + body) for the current
  [format](/api/attributes#format).
- **set** — parse a complete XML document through the format's importer and load it.

```js
editor.xml = '<TEI xmlns="http://www.tei-c.org/ns/1.0">…</TEI>';
const current = editor.xml;
```

## `format`

The active format (`'tei'` or `'jats'`). Set at initialization via the
[`format`](/api/attributes#format) attribute.

```js
console.log(editor.format); // 'tei'
```

## `tiptap`

The underlying [Tiptap](https://tiptap.dev/) `Editor` instance, for direct access to
commands and state.

```js
editor.tiptap.commands.setContent('<tei-div><tei-p>Hi</tei-p></tei-div>');
editor.tiptap.chain().focus().toggleMark('hi', { rend: 'b' }).run();
```

See the [JavaScript API](/api/javascript-api) for common command patterns.
