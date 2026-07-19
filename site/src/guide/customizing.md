---
layout: layouts/doc.njk
title: "Customizing the editor"
section: guide
permalink: /guide/customizing/index.html
---

# Customizing the editor

TEI (and similar vocabularies) leave many encoding choices open: lists may nest
paragraphs or hold text directly; references may point at different authorities;
manuscripts, inscriptions and born-digital texts use different tags for similar
ideas. JinnTap does not prescribe one tag set. Instead you configure a JSON
schema — which elements exist, their attributes, toolbar buttons, shortcuts and
authority lookups — so the editor matches *your* practice.

This page is a short recipe: add an element, style it, put it on the toolbar, and
optionally wire an authority connector. The [Schema reference](/schema/) documents
every property in detail.

<aside class="callout"><strong>Keep the schema small</strong>
<p>Only configure the elements you need, and remove built-in entries you will not
use. Where TEI offers several encodings for the same concept, pick one and
configure that alone — the editor needs a strict block/inline distinction, not the
full ambiguity of the Guidelines.</p>
</aside>

## 1. Add the element to the schema

Point [`schema`](/api/attributes#schema) at your own JSON file (or edit a copy of
[`src/tei-schema.json`](https://github.com/JinnElements/jinn-tap/blob/main/src/tei-schema.json)).
Append entries under the top-level `schema` object. Inline elements use
`"type": "inline"`; block elements use `"type": "block"`. Declare attributes and
value types so the attribute panel can validate them.

```jsonc
{
  // …
  "schema": {
    // …
    "rs": {
      "type": "inline",
      "attributes": {
        "type": {
          "type": "string",
          "enum": ["event", "person"]
        },
        "corresp": {
          "type": "string"
        }
      }
    }
  }
}
```

If a loaded document already contains markup that is not in the schema, JinnTap
**synthesizes** a generic entry so the element round-trips instead of being dropped —
see [Unknown elements](/schema/unknown-elements). To make it first-class (toolbar,
shortcuts, content model), add it here.

Full property list: [Element definitions](/schema/elements).

## 2. Style it in CSS

Schema awareness alone does not make the element visible to authors. Load a
stylesheet beside the editor chrome (the package ships
[`editor-styles.css`](https://github.com/JinnElements/jinn-tap/blob/main/editor-styles.css)
for TEI and `jats-editor-styles.css` for JATS — override or extend them).

In the editor, XML elements become HTML custom elements with a format prefix:
`rs` → `tei-rs` (or `jats-…` for JATS). Configured attributes are copied onto the
HTML element, so you can target them with attribute selectors.

```css
tei-rs[type="person"] {
  color: #e48500;
}
```

![Styled person reference: “Piet Heyn” highlighted in orange]({{ '/screenshots/styled-rs.png' | prefixUrl }})
*A `tei-rs[type="person"]` span after applying the rule above.*

<aside class="callout"><strong>Considerations</strong>
<p>Watch contrast against the page background, and prefer clear iconography on
toolbar buttons when a colour alone is not enough.</p>
</aside>

## 3. Put it on the toolbar

Elements appear on the toolbar either as a direct button or inside a dropdown
[`select`](/schema/toolbar#selects). Direct buttons are highly visible; selects
save space for less frequent markup.

### Direct button

```jsonc
"rs": {
  "type": "inline",
  "attributes": { /* … */ },
  "toolbar": {
    "Person": {
      "attributes": { "type": "person" },
      "label": "<i class='bi bi-person-fill'></i>",
      "order": 2
    }
  }
}
```

The button key (`"Person"`) is the tooltip. `label` is HTML — the demos use
[Bootstrap Icons](https://icons.getbootstrap.com/). Lower `order` values sort
further left.

### Button inside a select

Declare the group once under top-level `selects`, then set `"select": "…"` on the
button:

```jsonc
{
  "selects": {
    "Textcritical": {
      "label": "<i class='bi bi-highlighter'></i>"
    }
  },
  "schema": {
    "rs": {
      "type": "inline",
      "attributes": { /* … */ },
      "toolbar": {
        "Person": {
          "select": "Textcritical",
          "order": 2,
          "attributes": { "type": "person" },
          "label": "<i class='bi bi-person-fill'></i>"
        }
      }
    }
  }
}
```

<aside class="callout"><strong>Toolbar space</strong>
<p>Put the actions authors use most as direct buttons on the left
(<code>order</code>). File rarer options under selects — they are less
discoverable, so do not hide everyday markup there.</p>
</aside>

Details: [Toolbar & selects](/schema/toolbar).

## 4. Wire an authority connector (optional)

Some attributes should resolve against an external register (GND, GeoNames,
Airtable, …). Add a `connector` on the attribute definition:

```jsonc
"rs": {
  "type": "inline",
  "attributes": {
    "corresp": {
      "type": "string",
      "connector": {
        "name": "GND",
        "type": "person",
        "prefix": "gnd"
      }
    },
    "type": {
      "type": "string",
      "enum": ["event", "person"]
    }
  },
  "toolbar": { /* … */ }
}
```

![GND connector lookup for an rs element corresponding to Piet Heyn]({{ '/screenshots/connector-gnd.png' | prefixUrl }})
*Authority search in the attribute panel after selecting the annotated span.*

Connectors are rendered by `@teipublisher/pb-components` (a peer dependency). Load
its bundle to enable the lookup UI — see
[Installation → authority lookups](/guide/installation#authority-lookups). Without
it, the attribute remains a plain text field.

Full connector options: [Attributes & connectors](/schema/attributes#connectors).

## Next steps

- [Schema overview](/schema/) — top-level file shape and built-in catalogs
- [Keyboard & input rules](/schema/keyboard-and-input-rules) — shortcuts and typing rules
- [Embedding](/guide/embedding) — collaboration, slots, and host-app layout
- [Adding a format](/schema/adding-a-format) — dialects beyond TEI/JATS
