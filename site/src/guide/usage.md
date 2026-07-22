---
layout: layouts/doc.njk
title: "Usage"
section: guide
permalink: /guide/usage/index.html
embedEditor: true
---

# Usage

The editor below is a real `<jinn-tap>` instance. Type into it, apply formatting
from the toolbar, and use the source toggle (`</>`) to see the TEI XML.

{% include "partials/pb-page-open.njk" %}
{% include "partials/jinn-tap-embed.njk" %}
<jinn-toast></jinn-toast>
</pb-page>

## Seeding content

There are three ways to give the editor an initial document.

### Light-DOM markup

Place the document — in custom-element form (`tei-*`) — as children of `<jinn-tap>`.
It is read once when the component connects:

```html
<jinn-tap>
  <tei-div><tei-p>Initial content</tei-p></tei-div>
</jinn-tap>
```

### The `url` attribute

Point the editor at a TEI/JATS file to fetch and load:

```html
<jinn-tap url="document.xml"></jinn-tap>
```

### Setting content in JavaScript

Assign either an editor fragment (`content`) or a whole XML document (`xml`):

```js
const editor = document.querySelector('jinn-tap');

// A fragment, in the editor's custom-element form:
editor.content = '<tei-div><tei-p>New content</tei-p></tei-div>';

// …or a complete XML document (parsed via the importer for the current format):
editor.xml = '<TEI xmlns="http://www.tei-c.org/ns/1.0">…</TEI>';
```

See the [Properties](/api/properties) reference for the difference between `content`
and `xml`.

## Reading content back

Listen for [`content-change`](/api/events#content-change), or read the `xml`/`content`
properties on demand:

```js
editor.addEventListener('content-change', (event) => {
  const { body, xml } = event.detail;
  // body: the edited fragment, serialized back to XML
  // xml:  the full XML document (header + body) for the current format
});
```

## Local drafts

The editor above autosaves to **IndexedDB** in your browser (nothing is sent to a
server). Reload this page after editing and you will be prompted to restore your
draft or keep the starter document. Use **New** in the toolbar to discard the local
copy and start fresh (with a confirmation if a draft exists).

This behaviour comes from the optional [`@jinntec/jinntap/storage`](/guide/local-storage/)
module wired in by the docs site — it is not enabled on `<jinn-tap>` by default.
Server-backed apps (e.g. TEI Publisher) should save via `content-change` instead.

## Choosing a format

JinnTap supports TEI (default) and JATS. The format is fixed at initialization and
determines the element prefix (`tei-` or `jats-`):

```html
<jinn-tap format="jats"></jinn-tap>
```

## Customising the elements

Which elements exist, and the toolbar/shortcuts that create them, come from the
schema. To go beyond the defaults, supply your own via the
[`schema` attribute](/api/attributes#schema) and read the
[Schema reference](/schema/).

For day-to-day editing (blocks, footnotes, attributes, shortcodes), see
[Writing with the editor](/editing/).
