---
layout: layouts/doc.njk
title: "Keyboard & input rules"
section: schema
permalink: /schema/keyboard-and-input-rules/index.html
---

# Keyboard & input rules

## Keyboard shortcuts

An element's `keyboard` map binds shortcuts to the command that creates or toggles it.
`Mod` is <kbd>⌘</kbd> on macOS and <kbd>Ctrl</kbd> elsewhere.

```jsonc
"hi": {
  "type": "inline",
  "keyboard": {
    "Cmd-b":  { "attributes": { "rend": "b" } },
    "Cmd-i":  { "attributes": { "rend": "i" } },
    "ctrl-b": { "attributes": { "rend": "b" } },
    "ctrl-i": { "attributes": { "rend": "i" } }
  }
}
```

Each binding may carry:

| Property | Meaning |
| --- | --- |
| `attributes` | Attribute values applied when the shortcut fires. |
| `command` | An explicit command name (otherwise the element's default create/toggle command is used). |

The defaults shipped with JinnTap are listed in
[Keyboard shortcuts](/guide/keyboard-shortcuts).

<h2 id="input-rules">Input rules</h2>

`inputRules` create elements from typed patterns, Markdown-style. They apply to
`block` entries.

```json
"div": {
  "type": "block",
  "inputRules": [
    { "find": "^>>", "type": "wrapping" }
  ]
}
```

| Property | Meaning |
| --- | --- |
| `find` | A regular expression matched against the text being typed. |
| `type` | `wrapping` — wrap the block in this element; `textblock` — turn the current block into this element. |

For example, typing `>>` at the start of a line wraps the current block in a `div`;
heading rules turn `#`-prefixed lines into `head` elements.
