---
layout: layouts/doc.njk
title: "Element definitions"
section: schema
permalink: /schema/elements/index.html
---

# Element definitions

Each key under `schema` maps an XML element name to an editor node or mark. This page
documents every property an entry may carry, then lists the catalogs from both built-in
schemas.

<aside class="callout callout-info">
JinnTap ships two schemas, selected by the
<a href="{{ '/api/attributes/' | prefixUrl }}#format"><code>format</code></a> attribute:

<ul>
  <li><strong>TEI</strong> (default, <code>format="tei"</code>) —
    <a href="https://github.com/JinnElements/jinn-tap/blob/main/src/schema.json"><code>src/schema.json</code></a>
    — {{ schema.elementCount }} elements</li>
  <li><strong>JATS</strong> (<code>format="jats"</code>) —
    <a href="https://github.com/JinnElements/jinn-tap/blob/main/src/jats-schema.json"><code>src/jats-schema.json</code></a>
    — {{ jatsSchema.elementCount }} elements</li>
</ul>

Switching `format` also switches the editor’s XML handling:

- **TEI** (`format="tei"`, default): uses the TEI XML namespace
  `http://www.tei-c.org/ns/1.0`, emits/reads editor custom elements prefixed
  with `tei-` (e.g. `<tei-div>`), and uses TEI defaults for notes/anchors
  (`note` + `anchor` with `note.target → anchor.id`).
- **JATS** (`format="jats"`): assumes no default XML namespace, emits/reads
  editor custom elements prefixed with `jats-` (e.g. `<jats-sec>`), and uses
  JATS defaults for notes/anchors (`fn` + `xref` with `anchor.rid → note.id`).

Supply a custom file with the
<a href="{{ '/api/attributes/' | prefixUrl }}#schema"><code>schema</code></a> attribute to
replace the built-in schema for the active format.

To support another XML dialect, see
<a href="{{ '/schema/adding-a-format/' | prefixUrl }}">Adding a format</a>.
</aside>

## Anatomy of an entry

```jsonc
"div": {
  "type": "block",                        // required — see Node types
  "content": "heading* (block | table)*", // allowed children (ProseMirror content expr)
  "defining": true,                       // node defines its content boundary
  "selectable": true,                     // can be selected as a whole
  "group": "block",                       // content-model group it belongs to
  "attributes": { "type": { "type": "string" }, "n": { "type": "string" } },
  "keyboard": { "Mod-Shift-e": { "command": "wrapDiv" } },
  "toolbar": { "Division": { "command": "wrapDiv", "select": "Blocks", "label": "…" } },
  "inputRules": [ { "find": "^>>", "type": "wrapping" } ]
}
```

### Common properties

| Property | Applies to | Meaning |
| --- | --- | --- |
| `type` | all | The node type. Required. See [Node types](/schema/node-types). |
| `attributes` | all | The element's attributes and their value definitions. See [Attributes](/schema/attributes). |
| `content` | `block`, `list`, `listItem` | A ProseMirror [content expression](https://prosemirror.net/docs/guide/#schema.content_expressions) for the allowed children. |
| `group` | `block` | Content-model group the node belongs to (default `block`). Referenced by other elements' `content`. |
| `defining` | `block` | Marks the node as *defining* its content (affects paste/replace behaviour). |
| `selectable` | `block` | Whether the whole node can be selected. |
| `isolating`, `priority`, `inline` | `block` | Passed through to the ProseMirror node spec. |
| `tagName` | `listItem`, synthesized | Emit a different XML tag than the entry key. |
| `keyboard` | all | Keyboard shortcuts that create/toggle the element. See [Keyboard & input rules](/schema/keyboard-and-input-rules). |
| `toolbar` | all | Toolbar buttons that create/toggle the element. See [Toolbar & selects](/schema/toolbar). |
| `inputRules` | `block` | Markdown-style typing rules. See [Keyboard & input rules](/schema/keyboard-and-input-rules#input-rules). |
| `when` | conditional entries | Attribute conditions for dispatching one tag to different types. See [Conditional types](/schema/conditional-types). |

<h2 id="content">Content expressions</h2>

The `content` property is a ProseMirror content expression naming the groups/nodes a
block may contain. For example `div` allows optional headings followed by blocks or
tables:

```json
"content": "heading* (block | table)*"
```

Elements declare which group they join via `group` (blocks default to `block`), and
inline elements contribute to the implicit `inline` content of text blocks.

## Element catalogs

<h3 id="tei-catalog">TEI — <code>src/schema.json</code></h3>

Default when `format` is omitted or set to `tei`. **{{ schema.elementCount }} elements**.

{% set catalog = schema %}
{% include "partials/schema-element-table.njk" %}

<h3 id="jats-catalog">JATS — <code>src/jats-schema.json</code></h3>

Used when `format="jats"`. **{{ jatsSchema.elementCount }} elements**.

{% set catalog = jatsSchema %}
{% include "partials/schema-element-table.njk" %}

<p><small><strong>Flags:</strong> D = defining, S = selectable, C = <a href="{{ '/schema/conditional-types/' | prefixUrl }}">conditional</a>, T = has a toolbar button, 🔌 = has an authority <a href="{{ '/schema/attributes/' | prefixUrl }}#connectors">connector</a>.</small></p>
