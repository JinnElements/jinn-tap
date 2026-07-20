---
layout: layouts/doc.njk
title: "Keyboard shortcuts"
section: editing
permalink: /editing/keyboard-shortcuts/index.html
---

# Keyboard shortcuts

Element shortcuts are **defined in the schema**, so they depend on the active
format (`tei` or `jats`) and any custom [`schema`](/api/attributes#schema). The tables
below list the defaults from each of the two built-in schemas. `Mod` is <kbd>⌘</kbd> on
macOS and <kbd>Ctrl</kbd> elsewhere.

## Default element shortcuts

### TEI (`src/tei-schema.json`)

| Shortcut | Action |
| --- | --- |
| `Mod-b` / `Ctrl-b` | Bold — `hi` with `rend="b"` |
| `Mod-i` / `Ctrl-i` | Italic — `hi` with `rend="i"` |
| `Mod-Shift-e` | Wrap selection in a `div` |
| `Shift-Mod-1` | Heading — `head` (`n="1"`) |
| `Mod-Shift-l` | Toggle list |
| `Mod-Shift-u` | Insert footnote (`listAnnotation`) |
| `Mod-Shift-p` | Insert `persName` |
| `Mod-Shift-h` | Insert `placeName` |
| `Mod-Shift-t` | Insert `term` |
| `Mod-Alt-t` | `title` (`level="m"`) |
| `Alt-Shift-r` | Insert `ref` |
| `Mod-Alt-p` | Insert page break (`pb`) |

### JATS (`src/jats-schema.json`)

| Shortcut | Action |
| --- | --- |
| `Mod-b` | Bold — `bold` |
| `Mod-i` | Italic — `italic` |
| `Mod-Shift-e` | Wrap selection in a `sec` |
| `Shift-Mod-1` | Heading — `title` |
| `Mod-Shift-l` | Toggle list |
| `Mod-Shift-u` | Insert footnote (`fnGroup`) |
| `Mod-Shift-p` | Insert `named-content` (set `content-type` — person, place, organization, or term — in the attribute panel) |
| `Alt-Shift-r` | Insert `ext-link` |

JATS has no shortcut equivalents for TEI's `Mod-Shift-h`/`Mod-Shift-t` (place/term get
their own `content-type` instead of a separate element) or `Mod-Alt-p` (no page-break
element in the built-in JATS schema).

## Editing shortcuts

Provided by the underlying editor:

| Shortcut | Action |
| --- | --- |
| `Mod-z` | Undo |
| `Mod-Shift-z` | Redo |
| `Mod-c` / `Mod-x` / `Mod-v` | Copy / cut / paste |
| `Tab` / `Shift-Tab` | Indent / outdent list item |
| `Enter` | New list item (in a list) |
| `Backspace` at start of item | Convert list item to paragraph |

<aside class="callout"><strong>Defining your own</strong>
<p>Any element can declare shortcuts through its <code>keyboard</code> map in the schema — see
<a href="{{ '/schema/keyboard-and-input-rules/' | prefixUrl }}">Keyboard &amp; input rules</a>.</p>
</aside>
