---
layout: layouts/doc.njk
title: "Attributes"
section: api
permalink: /api/attributes/index.html
---

# Attributes

HTML attributes recognised by the `<jinn-tap>` element. Of these, `debug`, `url`,
`schema`, `block-typing` and `format` are *observed* (they take effect when changed
after connection); the rest are read once when the component initialises.

## Content & format

### `url`

Fetch and load a TEI/JATS document from a URL.

```html
<jinn-tap url="document.xml"></jinn-tap>
```

### `format`

The document format, `tei` (default) or `jats`.

`format` controls the editor end-to-end: it selects the default built-in schema
(unless you provide a custom [`schema`](#schema)), changes the HTML custom-element
prefix used in the editor (`tei-` / `jats-`), and switches the XML import/export
rules.

In particular:

- `tei` assumes TEI XML with namespace `http://www.tei-c.org/ns/1.0` and uses TEI
  defaults for notes/anchors.
- `jats` assumes JATS-style markup in no default XML namespace (export/import
  uses an empty namespace) and uses JATS defaults for notes/anchors.

`format` is *observed*, so changing the attribute will rebuild the editor using
the other built-in defaults (but if you set `schema`, your custom schema remains).

To wire up a third dialect (config, schema, XQuery import/export, styles), see
[Adding a format](/schema/adding-a-format).

```html
<jinn-tap format="jats"></jinn-tap>
```

<h3 id="schema"><code>schema</code></h3>

URL of a custom schema JSON to use instead of the built-in schema for the active
[`format`](#format) (`src/tei-schema.json` for TEI, `src/jats-schema.json` for JATS).
See the [Schema reference](/schema/).

```html
<jinn-tap schema="./my-schema.json"></jinn-tap>
```

## Layout

<h3 id="sidebar"><code>sidebar</code></h3>

CSS selector of an element to host the attribute/navigation sidebar. If omitted, a
sidebar container is created inside the component.

<h3 id="toolbar"><code>toolbar</code></h3>

CSS selector of an element to host the toolbar. If omitted, a toolbar is created
inside the component.

Extra toolbar items and sidebar content can also be provided with the `toolbar` and
`aside` [slots](/guide/embedding#toolbar-and-sidebar-slots).

## Editing behaviour

### `block-typing`

When present, disables direct text typing (and the cut / delete / backspace
shortcuts) while keeping the toolbar and its commands active — useful for documents
that should be structured only through commands.

### `debug`

Enables debug mode.

## Notes

### `notes`

How footnotes relate to their anchors. `connected` links notes to anchors; the
default (`disconnected`) allows notes without an anchor.

### `notes-wrapper`

The element name that wraps the notes/annotations list (default `listAnnotation`).

<h2 id="collaboration">Collaboration</h2>

Real-time collaboration is enabled when `server` is set. See
[Embedding → collaboration](/guide/embedding#real-time-collaboration).

| Attribute | Purpose |
| --- | --- |
| `server` | WebSocket URL of the Hocuspocus collaboration server |
| `token` | Authentication token for the collaboration server |
| `name` | Document name (room) to join |
| `user` | Display name of the current user |
| `color` | Caret/selection colour for the current user |

`user` and `color` fall back to `localStorage` values (`jinn-tap.username`,
`jinn-tap.color`) when omitted.
