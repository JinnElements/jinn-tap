---
layout: layouts/doc.njk
title: "Conditional types"
section: schema
permalink: /schema/conditional-types/index.html
---

# Conditional types

Sometimes one XML element name should map to **different** editor node types depending
on its attributes — for example a `<ref>` that is a cross-reference in one case and an
external link in another. JinnTap supports this by letting a schema entry be an
**array** of definitions instead of a single object.

<aside class="callout callout-info">This is an available capability of the schema (implemented in
[`src/extensions/extensions.js`](https://github.com/JinnElements/jinn-tap/blob/main/src/extensions/extensions.js));
neither built-in schema currently uses it. The example below is
illustrative.
</aside>

## Array form with `when`

Each item may carry a `when` object — a map of attribute → value that must all match
for that definition to apply:

```jsonc
"ref": [
  {
    "type": "ref",                 // used when target starts as an internal reference
    "when": { "type": "internal" }
  },
  {
    "type": "inline"               // the fallback for every other <ref>
  }
]
```

## How dispatch works

- **Order matters.** The first item keeps the element's base name; subsequent items are
  registered under `name + index` (e.g. `ref`, `ref1`), while still parsing and
  serializing to the same XML tag.
- **`when` matches** when *every* attribute in the object equals the element's value.
- **The default item** (no `when`) applies to elements that do *not* match any sibling
  `when` — it explicitly excludes the conditioned cases so exactly one definition wins.

This lets a single tag round-trip faithfully while behaving as different editor
constructs based on its attributes.

## Notes

- `when` compares attribute values with strict string equality.
- Don't confuse the dispatch key `when` with a TEI attribute *named* `when` (such as
  `date/@when`); the former is a top-level key on a definition object, the latter lives
  under an entry's `attributes`.
