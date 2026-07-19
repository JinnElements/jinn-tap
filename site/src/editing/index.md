---
layout: layouts/doc.njk
title: "Writing with the editor"
section: editing
permalink: /editing/index.html
embedEditor: true
---

# Writing in the editor

Try the behaviours below in the live editor (TEI XML mode).

<pb-page api-version="1.0.0">
{% include "partials/jinn-tap-embed.njk" %}
<jinn-toast></jinn-toast>
</pb-page>

## The editing model

The default starting point is always a **paragraph**. Use the toolbar (or shortcuts)
to turn it into a heading, list, or other block. 

Note that the editor is **strictly following** the underlying document model based on the XML format you're editing. This means not all elements are allowed at any position. In a TEI text, a heading may only appear at the start of a division, not after a paragraph.

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
  insert, delete, or edit their attributes, but not type text inside them.

## Inline markup

Select text and use a toolbar button (or shortcut) to apply inline markup (`hi`,
`ref`, `persName` etc. in TEI, `bold`, `italic`, `named-content` in JATS). Those 
controls are **toggles**: press again to remove the mark.

![Bold and Italic buttons highlighted in the toolbar]({{ '/screenshots/inline-markup.png' | prefixUrl }})
*The Bold and Italic buttons — most inline marks work the same way.*

See [Keyboard shortcuts](/editing/keyboard-shortcuts) for the TEI defaults.

## Attributes and breadcrumbs

As you move through the document, you'll see the attributes associated with the current node in the **attribute panel**. Its **position can differ**: by default the panel will stay at the bottom and may expand to the right for some types of nodes. If there's more space available, the attribute panel may also appear fixed in a sidebar or similar. This is up to the web developer to decide.

You may change any of the attribute values and click `apply` to write them to the document.

TEI example: mark some text bold (`hi`), then place the cursor inside it,
switch the dropdown to underline (`rend="u"`), and apply.

![The rend dropdown and Apply button in the attribute panel]({{ '/screenshots/attribute-panel.png' | prefixUrl }})
*Change a value, then click Apply to write it to the document.*

In many cases you may want to change attributes or apply actions on nodes which are **ancestors** of the current node.
The **breadcrumb panel** at the top below the toolbar shows you the path to the element the cursor is currently in. Clicking on an ancestor node selects and highlights it with an outline border. You can then change its attributes or apply actions like `Move up`, e.g. to lift a subsection into its parent.

![An ancestor "div" crumb highlighted in the breadcrumb bar]({{ '/screenshots/breadcrumbs.png' | prefixUrl }})
*Click any crumb to select that ancestor node.*

## Divisions

To create a new division, use the corresponding toolbar button (or type `>>` at the start of a block — see
[Shortcodes](#shortcodes)). The new division always becomes a
**child** of the division you are positioned in.

![The Division button inside the Block elements dropdown]({{ '/screenshots/divisions.png' | prefixUrl }})
*Block-level elements like Division, Figure, and Table live in this dropdown.*

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

![The Footnote button in the toolbar]({{ '/screenshots/footnote-button.png' | prefixUrl }})
*Inserts an anchor at the cursor and a matching note.*

![A footnote anchor marker in the text]({{ '/screenshots/footnote-anchor.png' | prefixUrl }})
*The small superscript number is the anchor — Ctrl/Cmd-click it to jump to its note.*

Configure behaviour on the web component with [`notes`](/api/attributes#notes):

| Mode | Attribute | Behaviour |
| --- | --- | --- |
| **Connected** | `notes="connected"` | Notes cannot exist without an anchor; deleting the anchor deletes the note. |
| **Disconnected** (default) | omit or unset | Deleting an anchor leaves the note (shown as orphaned). Inserting a new anchor can offer to re-link an orphan: the anchor id is copied to the clipboard and the first orphaned note is selected — paste the id into the note’s `target` field. |

Disconnected mode is especially useful for OCR-sourced text where notes were
recognised but anchors were not.

## Semantic annotations

JinnTap has extended support for semantic annotation, drawing on external registers to identify entities. In simpler words: the entity will be linked to an external authority database, uniquely identifying this particular person, place, organisation or term.

This is a feature provided by [TEI Publisher](https://tei-publisher.org) and uses the same library of [database connectors](https://github.com/eeditiones/tei-publisher-components/tree/master/src/authority), currently including GND, GeoNames and others.

For people, places, organisations, and terms, select the span and use the matching
toolbar button (e.g. **Person**). The attribute panel can show a **connector** search
(GND, GeoNames, …) when
[`@teipublisher/pb-components`](/guide/installation) is loaded.

Pick an entry with the link control to fill the `key` (or similar) attribute. Selecting
from the registry applies that attribute automatically — you usually do not need
**Apply** for that change alone. Extra entity info may appear at the top of the panel.

![The Person button in the toolbar]({{ '/screenshots/semantic-person-button.png' | prefixUrl }})
*Select a span of text first, then choose the matching entity type.*

![The Lookup control and Apply button in the attribute panel]({{ '/screenshots/semantic-connector-panel.png' | prefixUrl }})
*Expand Lookup to search the connected authority database.*

## Shortcodes

Type these at the **start of a paragraph** (input rules from the schema):

| Type… | Result |
| --- | --- |
| `##` | Turn the paragraph into a **heading** |
| `>>` | Wrap the current block in a **division** |
| `*` then space | Unordered list |
| `1.` then space | Numbered list |
| `--` / `---` | En dash (–) / em dash (—) |

More detail: [Keyboard & input rules](/schema/keyboard-and-input-rules).

## Figures and tables

Use the toolbar **Figure** and **Table** actions (or schema snippets) to insert a
figure (`figure` / `graphic` / `figDesc`) or a small table. Edit attributes of
`graphic` (e.g. `url`) in the side panel after selecting the figure or graphic via
breadcrumbs.

![The Table and Figure buttons in the Block elements dropdown]({{ '/screenshots/figures-tables.png' | prefixUrl }})
*Both live in the same dropdown as Division and the other block-level elements.*

## Source view

The **Show/Hide Code** toolbar control toggles a read-only XML view of the full
document so you can check what will be saved. Editing still happens in the rich-text
pane.

![The Show/Hide Code button in the toolbar]({{ '/screenshots/source-view.png' | prefixUrl }})
*Toggles a read-only XML view of the document.*

## Next steps

- [Keyboard shortcuts](/editing/keyboard-shortcuts)
- [Usage](/guide/usage) — seeding and reading content from an app
- [Schema reference](/schema/) — customise elements, toolbar, and shortcuts
- [Embedding](/guide/embedding) — drop `<jinn-tap>` into your application
