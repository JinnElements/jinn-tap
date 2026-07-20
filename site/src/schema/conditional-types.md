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

<aside class="callout callout-info">
<p>This capability is implemented in
<a href="https://github.com/JinnElements/jinn-tap/blob/main/src/extensions/extensions.js"><code>src/extensions/extensions.js</code></a>
and is used by the built-in JATS schema — for example <code>xref</code> maps to an
<code>anchor</code> when <code>@ref-type</code> is <code>fn</code> and to a plain
<code>inline</code> otherwise. (JATS also uses a related, attribute-level <code>when</code>
on <code>named-content</code>; see <a href="#attribute-level-when">below</a>.) The
<code>ref</code> example below is illustrative.</p>
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

<h2 id="attribute-level-when">Attribute-level <code>when</code></h2>

A related capability lets a single **attribute** carry an array of conditional
definitions, so the attribute panel shows a different editor (e.g. a different
authority connector) depending on another attribute's value. Here `when` is an
**XPath test** string rather than an attribute → value map. The JATS schema uses this
for `named-content`, where `@content-type` selects which connector `specific-use` gets:

```jsonc
"named-content": {
  "type": "inline",
  "attributes": {
    "specific-use": [
      {
        "when": "@content-type = 'person'",
        "type": "string",
        "connector": { "name": "GND", "type": "person", "prefix": "gnd" }
      },
      {
        "when": "@content-type = 'place'",
        "type": "string",
        "connector": { "name": "GeoNames", "type": "place", "prefix": "geo" }
      }
    ]
  }
}
```

Definitions are tried in order and the first whose `when` matches wins (see
[`src/attribute-panel.js`](https://github.com/JinnElements/jinn-tap/blob/main/src/attribute-panel.js)).
Only tests of the form `@name = 'value'` are currently supported.

## Notes

- `when` compares attribute values with strict string equality.
- Don't confuse the dispatch key `when` with a TEI attribute *named* `when` (such as
  `date/@when`); the former is a top-level key on a definition object, the latter lives
  under an entry's `attributes`.
