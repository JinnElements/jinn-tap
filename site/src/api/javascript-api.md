---
layout: layouts/doc.njk
title: "JavaScript API"
section: api
permalink: /api/javascript-api/index.html
---

# JavaScript API

Most programmatic control happens through the [`tiptap`](/api/properties#tiptap)
`Editor` instance, plus the element's own [properties](/api/properties) and
[events](/api/events).

```js
const el = document.querySelector('jinn-tap');
const editor = el.tiptap; // Tiptap Editor
```

## Loading and reading content

```js
// Load a fragment (custom-element form)
el.content = '<tei-div><tei-p>Hello</tei-p></tei-div>';

// Load a whole document
el.xml = '<TEI xmlns="http://www.tei-c.org/ns/1.0">…</TEI>';

// Read the document as XML
const xml = el.xml;

// React to edits
el.addEventListener('content-change', ({ detail }) => {
  save(detail.xml);
});
```

<h2 id="local-document-store-indexeddb">Local document store (IndexedDB)</h2>

Optional module: **`@jinntec/jinntap/storage`** (re-exported from `@jinntec/jinntap`).
Keeps full document XML in the browser's IndexedDB — nothing is uploaded. Not used
by `<jinn-tap>` itself; hosts opt in.

See the [Local document storage](/guide/local-storage/) guide for behaviour, record
shape, naming, restore prompts, and when to use it vs. server save.

```js
import { attachLocalStore, DocumentStore } from '@jinntec/jinntap/storage';
import { jinnToastConfirm } from '@jinntec/jinntap/jinn-toast';

const handle = await attachLocalStore(el, {
  onDraftAvailable: async (record) =>
    jinnToastConfirm(`Restore local draft “${record.name}”?`, {
      confirmLabel: 'Restore',
      cancelLabel: 'Keep current',
    }),
  onRestore: (record) => console.log('Restored', record.name),
});

await handle.rename('My letter'); // lock display title
await handle.clear();
el.newDocument();
```

**`attachLocalStore(editor, options?)`** → handle or `null` (skipped during collab
unless `{ force: true }`).

| Option | Default | Description |
| --- | --- | --- |
| `documentId` | `current-<format>` | IndexedDB key |
| `debounceMs` | `500` | Autosave delay (ms) |
| `autoRestore` | `false` | Restore without prompting |
| `onDraftAvailable` | — | `(record) => boolean \| Promise<boolean>` |
| `onRestore` | — | After restore |
| `onNameChange` | — | Display title changed |

Handle: `restore()`, `saveNow()`, `rename(name)`, `clear()`, `getRecord()`,
`detach()`, `restored`, `pendingDraft`, `store`.

**`DocumentStore`**: `open()`, `list()`, `get(id)`, `put(doc)`, `delete(id)`.

**Utilities**: `deduceDocumentName`, `extractTitleFromXml`, `isGenericTitle`,
`truncateTitle`.

## Commands

The `tiptap` editor exposes ProseMirror commands. The command names correspond to the
schema (`toggleMark` uses a mark's name, wrapping commands are declared per element):

```js
// Toggle an inline mark with attributes
editor.chain().focus().toggleMark('hi', { rend: 'b' }).run();

// Set a text selection, then apply
editor.commands.setTextSelection({ from: 10, to: 20 });
editor.commands.toggleMark('rs', { type: 'gnd' });

// Focus the editor
editor.commands.focus();
```

Which commands exist is driven by the [schema](/schema/): each element's
[toolbar](/schema/toolbar) and [keyboard](/schema/keyboard-and-input-rules) entries
name the command that creates it.

## Selection and state

```js
const { state } = editor;
const { from, to } = state.selection;
const isBold = editor.isActive('hi', { rend: 'b' });
```

For the full command and state API, see the
[Tiptap documentation](https://tiptap.dev/docs/editor/api/commands).
