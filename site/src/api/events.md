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

<h2 id="content-error"><code>content-error</code></h2>

Fired when loaded content does not fit the active schema and markup is dropped.
TipTap only rejects *unknown* element names; known elements in an invalid place
(e.g. a block nested inside a paragraph) are stripped by ProseMirror — JinnTap
detects that loss and warns.

Also mirrored as a sticky `jinn-toast` error (when a `<jinn-toast>` is present).

**`event.detail`**

| Field | Description |
| --- | --- |
| `message` | Human-readable summary |
| `violations` | Optional list of `{ parent, child }` for illegal nesting |
| `error` | Optional underlying Error (unknown-tag / TipTap path) |

```js
editor.addEventListener('content-error', (event) => {
  console.warn(event.detail.message, event.detail.lost);
});
```

## `jinn-toast`

Not dispatched on the element but on `document`: a request to display a toast
message (info/error). Render a `<jinn-toast>` element to show them. See
[Events guide → toasts](/guide/events#toast-notifications).

Pass `detail.confirm` (or use `jinnToastConfirm` from `@jinntec/jinntap/jinn-toast`)
for a sticky toast with confirm/cancel actions that resolves to a boolean.
