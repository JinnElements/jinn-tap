---
layout: layouts/doc.njk
title: "Writing with the editor"
section: editing
permalink: /editing/index.html
embedEditor: true
---

# Writing with the editor

This page is a hands-on guide for authors. It follows the built-in TEI schema
([`src/schema.json`](https://github.com/JinnElements/jinn-tap/blob/main/src/schema.json));
JATS has the same editing model with different element names. Try the behaviours below
in the live editor — it loads the same sample as
[`docs.xml`](https://github.com/JinnElements/jinn-tap/blob/main/site/public/demo/docs.xml).

<pb-page api-version="1.0.0">
{% include "partials/jinn-tap-embed.njk" %}
<jinn-toast></jinn-toast>
</pb-page>

## The editing model

What you see maps directly onto XML: paragraphs are `<p>`, divisions are `<div>`, and
so on. The editor is strict about **block vs inline** content — TEI often allows the
same name in both roles, but ProseMirror does not. Allowed positions come from the
[schema](/schema/), not from the full TEI Guidelines.

The default starting point is always a **paragraph**. Use the toolbar (or shortcuts)
to turn it into a heading, list, or other block. Not every element is valid in every
place: a `head` may only appear at the start of a division, not after a paragraph —
unlike HTML.

<aside class="callout callout-info">
Elements missing from the schema are no longer silently dropped. JinnTap
<a href="{{ '/schema/unknown-elements/' | prefixUrl }}">synthesizes</a> generic
entries so unknown markup round-trips and stays editable (visually marked as unknown).
For production work you should still extend the schema so those elements get proper
toolbar buttons, content models, and attributes.
</aside>

## Blocks, lists, and empty markers

- Pressing **Backspace** or **Delete** inside an otherwise empty block removes that
  block.
- In a list:
  - **Tab** nests a list under the current item.
  - **Shift-Tab** moves the item one level up; at the top level it becomes a normal
    paragraph.
  - TEI lists may start with a heading: place the cursor in the first item and choose
    **Head** from the toolbar.
- Empty elements such as `lb`, `pb`, or `gap` appear as coloured markers. You can
  insert, delete, or edit their attributes, but not type inside them.

## Inline markup

Select text and use a toolbar button (or shortcut) to apply inline markup (`hi`,
`ref`, `persName`, …). Those controls are **toggles**: press again to remove the mark.

See [Keyboard shortcuts](/editing/keyboard-shortcuts) for the TEI defaults.

## Attributes and breadcrumbs

As you move through the document, the **right-hand panel** shows a form for attributes
of the current element. Change values and click **Apply**.

Example: mark text bold (`hi` with `rend="b"`), then place the cursor inside it and
switch the dropdown to underline (`rend="u"`), then apply.

To edit an **ancestor** (e.g. the enclosing `div` while the cursor is in a `p`), use
the **breadcrumb** bar at the upper right. It lists ancestors down to the active node;
click a crumb to select that node and load its attributes in the panel.

## Divisions

Use the **Division** toolbar button (or type `>>` at the start of a block — see
[Shortcodes](#shortcodes)) to wrap content in a `div`. The new division is always a
**child** of the division you are in.

To move a division one level up:

1. Place the cursor inside it.
2. Select the division via the breadcrumb bar.
3. Click **Move up** in the toolbar.

The same procedure works for other blocks. Moving a block up when siblings follow it
in the same parent **splits** the enclosing division.

## Footnotes

Footnotes are **standoff** annotations, not inline note text in the paragraph. Each
note is two pieces:

1. an **anchor** in the text (the reference), and
2. a **note** block in a standoff list (`listAnnotation` in TEI).

The note links to the anchor via `target` (pointing at the anchor’s `xml:id`).

Click an anchor to select it. Hold **Ctrl** (or **⌘** on Mac) and click to jump to
the note text.

Configure behaviour on the web component with [`notes`](/api/attributes#notes):

| Mode | Attribute | Behaviour |
| --- | --- | --- |
| **Connected** | `notes="connected"` | Notes cannot exist without an anchor; deleting the anchor deletes the note. |
| **Disconnected** (default) | omit or unset | Deleting an anchor leaves the note (shown as orphaned). Inserting a new anchor can offer to re-link an orphan: the anchor id is copied to the clipboard and the first orphaned note is selected — paste the id into the note’s `target` field. |

Disconnected mode is especially useful for OCR-sourced text where notes were
recognised but anchors were not.

## Semantic annotations

For people, places, organisations, and terms, select the span and use the matching
toolbar button (e.g. **Person**). The attribute panel can show a **connector** search
(GND, GeoNames, …) when
[`@teipublisher/pb-components`](/guide/installation) is loaded.

Pick an entry with the link control to fill the `key` (or similar) attribute. Selecting
from the registry applies that attribute automatically — you usually do not need
**Apply** for that change alone. Extra entity info may appear at the top of the panel.

## Shortcodes

Type these at the **start of a paragraph** (input rules from the schema):

| Type… | Result |
| --- | --- |
| `##` | Turn the paragraph into a `head` |
| `>>` | Wrap the current block in a `div` |
| `*` then space | Unordered list |
| `1.` then space | Numbered list |
| `--` / `---` | En dash (–) / em dash (—) |

More detail: [Keyboard & input rules](/schema/keyboard-and-input-rules).

## Figures and tables

Use the toolbar **Figure** and **Table** actions (or schema snippets) to insert a
figure (`figure` / `graphic` / `figDesc`) or a small table. Edit attributes of
`graphic` (e.g. `url`) in the side panel after selecting the figure or graphic via
breadcrumbs.

## Source view

The **Show/Hide Code** toolbar control toggles a read-only XML view of the full
document so you can check what will be saved. Editing still happens in the rich-text
pane.

## Next steps

- [Keyboard shortcuts](/editing/keyboard-shortcuts)
- [Usage](/guide/usage) — seeding and reading content from an app
- [Schema reference](/schema/) — customise elements, toolbar, and shortcuts
- [Embedding](/guide/embedding) — drop `<jinn-tap>` into your application
