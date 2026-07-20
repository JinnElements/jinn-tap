---
layout: layouts/doc.njk
title: "Events"
section: api
permalink: /api/events/index.html
---

# Events

<h2 id="content-change"><code>content-change</code></h2>

Fired whenever the document changes, and once after content is loaded.

**`event.detail`**

| Field | Description |
| --- | --- |
| `body` | The edited fragment, serialized back to XML |
| `xml` | The full XML document (header/metadata + body) for the current format |

```js
editor.addEventListener('content-change', (event) => {
  const { body, xml } = event.detail;
});
```

## `ready`

Fired once, after the editor has been created and initialised. Carries no `detail`.

```js
editor.addEventListener('ready', () => {
  /* editor.tiptap is now available */
});
```

## `jinn-toast`

Not dispatched on the element but on `document`: a request to display a toast
message (info/error). Render a `<jinn-toast>` element to show them. See
[Events guide → toasts](/guide/events#toast-notifications).
