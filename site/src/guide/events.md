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

## `content-error`

Fired when imported markup does not fit the schema and elements are dropped
(including known tags in an invalid place, which ProseMirror strips silently).
See [Events API → content-error](/api/events#content-error).

```js
editor.addEventListener('content-error', (event) => {
  console.warn(event.detail.message);
});
```

## Toast notifications

Informational and error messages (e.g. "some markup was dropped", authority
notices) are surfaced through a `jinn-toast` custom event on `document`, rendered by
the `<jinn-toast>` element. Include one in your page to display them:

```html
<jinn-tap></jinn-tap>
<jinn-toast></jinn-toast>
```

Dispatch a toast from anywhere:

```js
document.dispatchEvent(new CustomEvent('jinn-toast', {
  detail: { message: 'Saved', type: 'info' }, // info | warn | error
}));
```

For a confirm dialog, pass a `confirm` object (or use the helper):

```js
import { jinnToastConfirm } from '@jinntec/jinntap/jinn-toast';

const ok = await jinnToastConfirm('Discard unsaved changes?', {
  confirmLabel: 'Discard',
  cancelLabel: 'Keep editing',
  type: 'warn',
});
```

Under the hood this dispatches a sticky toast with action buttons:

```js
document.dispatchEvent(new CustomEvent('jinn-toast', {
  detail: {
    message: 'Restore local draft?',
    type: 'info',
    sticky: true,
    confirm: {
      confirmLabel: 'Restore',
      cancelLabel: 'Keep current',
      onConfirm: () => { /* … */ },
      onCancel: () => { /* … */ },
    },
  },
}));
```
