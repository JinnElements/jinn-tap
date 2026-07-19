---
layout: layouts/doc.njk
title: "Introduction"
section: guide
permalink: /guide/index.html
---

# Introduction

JinnTap is a rich-text editor for XML documents, delivered as a
web component. Unlike other editors it keeps the XML structure intact: what you see in the editor maps directly onto
the underlying XML.

XML elements are represented in the editor as HTML **custom elements** — for TEI XML this would be: `<tei-div>`,
`<tei-p>`, `<tei-hi>`, and so on — preserving every attribute and structural feature.
There is no lossy transformation step, so round-tripping a document through the editor
does not silently drop markup it doesn't recognise (see [Unknown elements](/schema/unknown-elements)).

JinnTap is meant to be customized to match your encoding needs and practice. It does not attempt to have a representation for
every element or attribute in an XML schema. For TEI this would not even be possible: many elements are ambiguous and could be used as inline as well as block elements, while the editor requires a clear distinction.

In practice, you want to restrict the choices collaborators can make in a project to keep consistency. Therefore we only include the most common elements and very few global attributes in the default schemata. It's up to you to extend those — see [Customizing the editor](/guide/customizing) for a walkthrough.

## How it works

Internally JinnTap builds on [ProseMirror](https://prosemirror.net/) (via
[Tiptap](https://tiptap.dev/)). A single JSON configuration or schema declares:

- which XML elements exist and how each maps to an editor node or mark,
- the attributes each element carries,
- the toolbar buttons, keyboard shortcuts and input rules that create them.

Changing what the editor can do is therefore mostly a matter of editing the schema —
see the [Schema reference](/schema/).

## Where it runs

JinnTap is usually embedded into a larger application such as **TEI Publisher 10**,
which handles loading and saving documents. The editor itself is purely client-side and doesn't need any server.
The embedded demo instances included in this documentation are browser-only: they won't save your edits, but are still fully functional.

## Next steps

- [Installation](/guide/installation)
- [Usage](/guide/usage)
- [Customizing the editor](/guide/customizing) — schema, CSS, toolbar, connectors
- [Writing with the editor](/editing/) — blocks, footnotes, attributes, shortcodes
- [Schema reference](/schema/) — the main extension point
- [Web component API](/api/attributes)
