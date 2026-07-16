---
layout: layouts/doc.njk
title: "Keyboard shortcuts"
section: guide
permalink: /guide/keyboard-shortcuts/index.html
---

# Keyboard shortcuts

Element shortcuts are **defined in the schema**, so they depend on the active
[`schema.json`](/schema/keyboard-and-input-rules). The table below lists the defaults
shipped with JinnTap. `Mod` is <kbd>⌘</kbd> on macOS and <kbd>Ctrl</kbd> elsewhere.

## Default element shortcuts

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
Any element can declare shortcuts through its `keyboard` map in the schema — see
[Keyboard & input rules](/schema/keyboard-and-input-rules).
</aside>
