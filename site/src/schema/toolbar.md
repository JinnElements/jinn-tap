---
layout: layouts/doc.njk
title: "Toolbar & selects"
section: schema
permalink: /schema/toolbar/index.html
---

# Toolbar & selects

Toolbar buttons come from two places: the top-level `toolbar` (global buttons not tied
to a single element) and each element entry's own `toolbar` (buttons that create or
toggle that element). `selects` defines dropdown groups that buttons can be filed
under.

## Button definition

```jsonc
"Bold": {
  "attributes": { "rend": "b" },          // attributes to apply
  "command": "toggleMark",                // command to run (defaults to the element's own)
  "label": "<i class='bi bi-type-bold'></i>", // HTML label (Bootstrap Icons in the demo)
  "order": 5,                              // sort order within its group/toolbar
  "select": "Textcritical"                // optional: place inside a dropdown group
}
```

| Property | Meaning |
| --- | --- |
| `command` | The command to run. For element toolbars it defaults to the element's create/toggle command. |
| `attributes` | Attribute values applied when the button runs. |
| `label` | HTML shown on the button (the demo uses [Bootstrap Icons](https://icons.getbootstrap.com/)). |
| `order` | Sort position within the toolbar or its dropdown. |
| `select` | Name of a [`selects`](#selects) group to nest the button in. |
| `args` | Arguments for the command — e.g. the snippet for `insertSnippet`. |
| `requiresAttribute` | If set, the button is only rendered when `<jinn-tap>` has that boolean attribute (e.g. `fullscreen`). |

## Snippets

Global buttons often insert a fixed fragment with `insertSnippet`, whose `args` hold
the markup (placeholders like `{abbrev}` are filled interactively):

```json
"choice/abbr/expan": {
  "command": "insertSnippet",
  "args": ["<tei-choice><tei-abbr>{abbrev}</tei-abbr><tei-expan>{expansion}</tei-expan></tei-choice>"],
  "select": "Textcritical",
  "label": "<i class='bi bi-three-dots'></i>"
}
```

<h2 id="selects">Selects</h2>

`selects` declares named dropdown groups. Any toolbar button with a matching `select`
appears inside that dropdown instead of directly on the toolbar.

```json
"selects": {
  "Blocks":      { "label": "<i class='bi bi-text-paragraph'></i>", "order": 0 },
  "Textcritical":{ "label": "<i class='bi bi-highlighter'></i>",     "order": 9 }
}
```

Groups in the built-in **TEI** schema:

<ul>
  {% for s in schema.selects %}<li><code>{{ s.name }}</code>{% if s.order != null %} (order {{ s.order }}){% endif %}</li>{% endfor %}
</ul>

JATS defines only <code>Blocks</code>.

## Global toolbar buttons in the TEI schema

<ul>
  {% for name in schema.globalToolbar %}<li><code>{{ name }}</code></li>{% endfor %}
</ul>

JATS global buttons: {% for name in jatsSchema.globalToolbar %}<code>{{ name }}</code>{% if not loop.last %}, {% endif %}{% endfor %}.
