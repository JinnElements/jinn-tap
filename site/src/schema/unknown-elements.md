---
layout: layouts/doc.njk
title: "Unknown elements"
section: schema
permalink: /schema/unknown-elements/index.html
---

# Unknown elements

A document may contain elements the active schema doesn't describe. Rather than
silently dropping them (and their content), JinnTap **synthesizes** a generic schema
entry for each unknown element so it round-trips through the editor and stays editable.

This is handled by
[`src/util/unknown-elements.js`](https://github.com/JinnElements/jinn-tap/blob/main/src/util/unknown-elements.js),
which runs whenever content is loaded.

## How the kind is inferred

The synthesized `type` is inferred from how the element is actually used in the
document, classified to a fixpoint (because an element's nature can depend on its
unknown parents/children):

| Observed usage | Synthesized type |
| --- | --- |
| Never has children | `empty` |
| Contains block-level children | `block` (container) |
| Block-level, only inline/text children | `block` (text block) |
| Sits inside inline/text content | `inline` (mark) |

Attributes seen on the unknown element are collected into the synthesized entry so they
are preserved too.

## Visual marking

Unknown elements are tagged in the reading pane so authors can see that they aren't
part of the schema:

- block/inline unknowns get a `jinn-tap-unknown` class and a `data-tag` marker,
- empty unknowns get a `jinn-tap-unknown-empty` class.

These render-time hints never leak into the serialized XML.

## Original-case names

Custom-element tag names are lower-cased in HTML, but the original (possibly
camelCase) name — e.g. `soCalled` — is recovered from the source XML so the element
serializes back with its original spelling.

## Notifications

When unknown elements are encountered, a toast reports how many element types were
preserved (see [Events → toasts](/guide/events#toast-notifications)).

## Why this matters

It means loading a document into JinnTap is **non-destructive** even if the schema is
incomplete: unrecognised markup survives the edit/save cycle instead of being thrown
away. To make an element first-class (with a toolbar button, shortcuts, specific
content model), add it to your [schema](/schema/).
