---
layout: layouts/doc.njk
title: "JavaScript API"
section: api
permalink: /api/javascript-api/index.html
---

# JavaScript API

Most programmatic control happens through the [`tiptap`](/api/properties#tiptap)
`Editor` instance, plus the element's own [properties](/api/properties) and
[events](/api/events).

```js
const el = document.querySelector('jinn-tap');
const editor = el.tiptap; // Tiptap Editor
```

## Loading and reading content

```js
// Load a fragment (custom-element form)
el.content = '<tei-div><tei-p>Hello</tei-p></tei-div>';

// Load a whole document
el.xml = '<TEI xmlns="http://www.tei-c.org/ns/1.0">…</TEI>';

// Read the document as XML
const xml = el.xml;

// React to edits
el.addEventListener('content-change', ({ detail }) => {
  save(detail.xml);
});
```

## Commands

The `tiptap` editor exposes ProseMirror commands. The command names correspond to the
schema (`toggleMark` uses a mark's name, wrapping commands are declared per element):

```js
// Toggle an inline mark with attributes
editor.chain().focus().toggleMark('hi', { rend: 'b' }).run();

// Set a text selection, then apply
editor.commands.setTextSelection({ from: 10, to: 20 });
editor.commands.toggleMark('rs', { type: 'gnd' });

// Focus the editor
editor.commands.focus();
```

Which commands exist is driven by the [schema](/schema/): each element's
[toolbar](/schema/toolbar) and [keyboard](/schema/keyboard-and-input-rules) entries
name the command that creates it.

## Selection and state

```js
const { state } = editor;
const { from, to } = state.selection;
const isBold = editor.isActive('hi', { rend: 'b' });
```

For the full command and state API, see the
[Tiptap documentation](https://tiptap.dev/docs/editor/api/commands).
