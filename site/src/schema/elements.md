---
layout: layouts/doc.njk
title: "Element definitions"
section: schema
permalink: /schema/elements/index.html
---

# Element definitions

Each key under `schema` maps an XML element name to an editor node or mark. This page
documents every property an entry may carry, then lists the full catalog from the
default schema (generated directly from `src/schema.json`).

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

## Element catalog

Generated from the default `src/schema.json` — **{{ schema.elementCount }} elements**.

<table>
  <thead>
    <tr>
      <th>Element</th>
      <th>Type</th>
      <th>Content</th>
      <th>Attributes</th>
      <th>Flags</th>
    </tr>
  </thead>
  <tbody>
    {% for el in schema.elements %}<tr>
      <td><code>{{ el.name }}</code></td>
      <td>
        {% for t in el.types %}<code>{{ t }}</code>{% if not loop.last %} / {% endif %}{% endfor %}
      </td>
      <td>{% if el.content %}<code>{{ el.content }}</code>{% else %}—{% endif %}</td>
      <td>
        {% if el.attributes.length %}{% for a in el.attributes %}<code>{{ a.name }}</code>{% if not loop.last %}, {% endif %}{% endfor %}{% else %}—{% endif %}
      </td>
      <td>
        {% if el.defining %}<span title="defining">D </span>{% endif %}{% if el.selectable %}<span title="selectable">S </span>{% endif %}{% if el.conditional %}<span title="conditional (when)">C </span>{% endif %}{% if el.hasConnector %}<span title="authority connector">🔌 </span>{% endif %}{% if el.hasToolbar %}<span title="has toolbar button">T </span>{% endif %}
      </td>
    </tr>{% endfor %}
  </tbody>
</table>

<p><small><strong>Flags:</strong> D = defining, S = selectable, C = <a href="/jinn-tap/schema/conditional-types">conditional</a>, T = has a toolbar button, 🔌 = has an authority <a href="/jinn-tap/schema/attributes#connectors">connector</a>.</small></p>
