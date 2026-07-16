---
layout: layouts/doc.njk
title: "Introduction"
section: guide
permalink: /guide/index.html
---

# Introduction

JinnTap is a rich-text editor for **TEI** (and **JATS**) XML documents, delivered as a
web component. Unlike editors that convert TEI to HTML for editing and back again,
JinnTap keeps the XML structure intact: what you see in the editor maps directly onto
the underlying XML.

TEI elements are represented in the editor as HTML **custom elements** — `<tei-div>`,
`<tei-p>`, `<tei-hi>`, and so on — preserving every attribute and structural feature.
There is no lossy transformation step, so round-tripping a document through the editor
does not silently drop markup it doesn't recognise (see [Unknown elements](/schema/unknown-elements)).

## How it works

Internally JinnTap builds on [ProseMirror](https://prosemirror.net/) (via
[Tiptap](https://tiptap.dev/)). A single [`schema.json`](/schema/) declares:

- which XML elements exist and how each maps to an editor node or mark,
- the attributes each element carries,
- the toolbar buttons, keyboard shortcuts and input rules that create them.

Changing what the editor can do is therefore mostly a matter of editing the schema —
see the [Schema reference](/schema/).

## Where it runs

JinnTap is usually embedded into a larger application such as **TEI Publisher 10**,
which handles loading and saving documents. The [documentation site](https://jinnelements.github.io/jinn-tap/)
includes live TEI and JATS editors — and it can
be dropped into any app as a [web component](/guide/embedding).

Optional features include **authority lookups** (GND, GeoNames, Airtable …) via
attribute [connectors](/schema/attributes#connectors), and **real-time
collaboration**.

## Next steps

- [Installation](/guide/installation)
- [Usage](/guide/usage)
- [Schema reference](/schema/) — the main extension point
- [Web component API](/api/attributes)
