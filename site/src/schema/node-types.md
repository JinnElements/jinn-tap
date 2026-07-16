---
layout: layouts/doc.njk
title: "Node types"
section: schema
permalink: /schema/node-types/index.html
---

# Node types

Every element entry has a `type` that decides which editor construct it becomes. The
dispatch happens in
[`src/extensions/extensions.js`](https://github.com/JinnElements/jinn-tap/blob/main/src/extensions/extensions.js).

## The types

| `type` | Becomes | Typical use |
| --- | --- | --- |
| `inline` | a **mark** | phrase-level markup wrapping text: `hi`, `rs`, `foreign`, `persName` |
| `block` | a block **node** | paragraphs, divisions, headings, quotes |
| `empty` | a self-closing (atom) node | milestones with no content: `pb`, `lb`, `milestone` |
| `ref` | an inline reference node | `ref`/link-like elements |
| `anchor` | an anchor node | footnote anchors (paired with `note`) |
| `note` | a note node | footnote/annotation bodies (via a `group`) |
| `list` | a list node | `list` containers |
| `listItem` | a list item node | `item` — supports a custom `tagName` |
| `table` / `row` / `cell` | table nodes | `table`, `row`, `cell` |
| `graphic` | a graphic/figure node | images |

## Marks vs. nodes

The most important distinction:

- **`inline` → mark.** Marks wrap runs of text and can overlap. Use `inline` for
  anything that decorates or annotates text without being a container.
- **everything else → node.** Nodes are structural. `block` nodes hold other blocks or
  inline content (via [`content`](/schema/elements#content)); `empty` nodes hold
  nothing; list/table nodes have fixed child structures.

## Block details

`block` entries pass several optional properties straight through to the node:
`group` (default `block`), `content`, `defining`, `selectable`, `isolating`,
`priority`, `inline`. See [Element definitions](/schema/elements) for what each means.

## Elements per type in the default schema

<ul>
  {% for row in schema.typeCountsList %}<li><code>{{ row.type }}</code> — {{ row.count }} element(s)</li>{% endfor %}
</ul>

<p><em>{{ schema.elementCount }} elements total. Generated from <code>src/schema.json</code>.</em></p>
