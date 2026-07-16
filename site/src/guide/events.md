---
layout: layouts/doc.njk
title: "Events"
section: guide
permalink: /guide/events/index.html
---

# Events

`<jinn-tap>` dispatches DOM events you can listen to like any element. See the
[Events API](/api/events) for the exact payloads.

## `content-change`

Fired whenever the document changes (and once after content is loaded).

```js
const editor = document.querySelector('jinn-tap');

editor.addEventListener('content-change', (event) => {
  const { body, xml } = event.detail;
  // body: the edited fragment serialized to XML
  // xml:  the full XML document (header + body) for the current format
  console.log(xml);
});
```

## `ready`

Fired once, after the editor has been created and initialised.

```js
editor.addEventListener('ready', () => {
  console.log('editor ready');
});
```

## Toast notifications

Informational and error messages (e.g. "some markup may be lost", authority
notices) are surfaced through a `jinn-toast` custom event on `document`, rendered by
the `<jinn-toast>` element. Include one in your page to display them:

```html
<jinn-tap></jinn-tap>
<jinn-toast></jinn-toast>
```
