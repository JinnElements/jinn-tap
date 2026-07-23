---
layout: layouts/doc.njk
title: "Local document storage"
section: guide
permalink: /guide/local-storage/index.html
---

# Local document storage

JinnTap itself is an in-memory editor: it does not save anything unless a **host
application** listens for [`content-change`](/api/events#content-change) and writes
`detail.xml` somewhere (a server, a file download, …).

For browser-only use — demos, offline drafts, or apps where users should not share
documents with a server — the optional **`@jinntec/jinntap/storage`** module adds an
IndexedDB safety net. Edits stay on the user's device; nothing is uploaded.

The embedded editors in this documentation site use it: reload the page after editing
and you will be asked whether to restore your local draft.

## Import

The storage helpers ship as a separate entry point (also re-exported from the main
package):

```js
import {
  attachLocalStore,
  DocumentStore,
  deduceDocumentName,
} from '@jinntec/jinntap/storage';
```

Include `<jinn-toast></jinn-toast>` if you use [`jinnToastConfirm`](/guide/events#toast-notifications)
for restore / discard prompts.

## Quick start

```js
import { attachLocalStore } from '@jinntec/jinntap/storage';
import { jinnToastConfirm } from '@jinntec/jinntap/jinn-toast';

const editor = document.querySelector('jinn-tap');

const handle = await attachLocalStore(editor, {
  onDraftAvailable: async (record) =>
    jinnToastConfirm(`Restore local draft “${record.name}”?`, {
      confirmLabel: 'Restore',
      cancelLabel: 'Keep current',
    }),
  onRestore: (record) => console.log('Restored', record.name),
  onNameChange: (name) => { titleInput.value = name; },
});
```

`attachLocalStore` waits for the editor's [`ready`](/api/events#ready) event, then:

1. Looks up a stored document for the current format.
2. If one exists, calls `onDraftAvailable` (when provided) and restores only when
   that callback returns `true`, or when `{ autoRestore: true }` is set.
   If the callback returns `false` (e.g. “Keep current”), the stored draft is
   **deleted** so the prompt does not appear again on the next reload.
3. Listens to [`content-change`](/api/events#content-change) and debounces writes
   (500&nbsp;ms by default) to IndexedDB.

Collaboration sessions (`server` attribute) skip local attach unless you pass
`{ force: true }`.

## `attachLocalStore(editor, options)`

Returns a **handle** (or `null` when skipped). The handle exposes:

| Method / property | Description |
| --- | --- |
| `restore(record?)` | Load a draft into the editor (uses `pendingDraft` or fetches by id) |
| `saveNow()` | Persist the current document immediately |
| `rename(name)` | Set a human-readable title and lock it (`nameLocked`) |
| `loadDocument(xml, { filename? })` | Replace content from an upload; unlocks and re-deduces the display name |
| `clear()` | Delete the stored record for this `documentId` |
| `getRecord()` | Read the current stored record |
| `detach()` | Stop autosaving and remove the listener |
| `restored` | `true` if a draft was restored during attach |
| `pendingDraft` | The draft found on attach if restore was deferred (no `onDraftAvailable`) |
| `documentId` | The IndexedDB key in use |
| `store` | The underlying `DocumentStore` instance |

### Options

| Option | Default | Description |
| --- | --- | --- |
| `documentId` | `current-<format>` | Stable key (`current-tei`, `current-jats`, …) |
| `debounceMs` | `500` | Delay before writing after each edit |
| `autoRestore` | `false` | Restore immediately without asking |
| `onDraftAvailable` | — | `(record) => boolean \| Promise<boolean>` — return `true` to restore. Returning `false` **deletes** the stored draft so the prompt does not repeat. |
| `onRestore` | — | Called after a draft is loaded into the editor |
| `onNameChange` | — | Called when the display name changes (autosave or rename) |
| `store` | new `DocumentStore()` | Reuse an existing store (e.g. for multiple editors) |
| `force` | `false` | Attach even when collaboration is active |

### Restore vs. `url`

When a draft **is** restored, the `url` attribute is removed so a later attribute
change cannot reload remote content over the draft. When the user **declines**
restore, the editor keeps whatever was loaded initially (e.g. a starter document
from `url`).

## Stored record shape

Each document is stored in IndexedDB database `jinntap`, object store `documents`:

| Field | Description |
| --- | --- |
| `id` | Same as `documentId` (key path) |
| `name` | Human-readable display title |
| `format` | `tei` or `jats` |
| `xml` | Full document XML (header + body) |
| `updatedAt` | Last save time (epoch ms) |
| `nameLocked` | When `true`, autosave will not overwrite `name` |
| `filename` | Optional download filename (`metadata.name`) |

Full `xml` is stored (not just the body fragment) so TEI headers and other
metadata round-trip through the existing import/export pipeline.

## Document names

On each autosave, if `nameLocked` is not set, the display name is deduced in order
from:

1. A meaningful `editor.metadata.title` (two words with the last at least three
   letters — shorter values are treated as provisional and do not stick)
2. The TEI `titleStmt/title` or JATS `article-title` in the XML header (same rule)
3. The first non-empty line of plain text in the editor
4. `"Untitled Document"`

Provisional titles (fewer than two words, or a last word shorter than three
letters) still update the toolbar while you type, but are not written into
`metadata.title` until they look complete — otherwise a paused keystroke would
freeze the name mid-word. Autosave itself debounces for 1.2s by default.

Call `handle.rename('My letter')` to set a title explicitly; this sets
`nameLocked` and syncs `metadata.title` so export writes it into the header.

Utility functions are exported for hosts that build their own UI:

```js
import { deduceDocumentName, extractTitleFromXml } from '@jinntec/jinntap/storage';
```

## Lower-level API: `DocumentStore`

Use `DocumentStore` directly when you need a document picker or multi-document
workflow later:

```js
const store = new DocumentStore();
await store.open();

await store.put({ id: 'letter-1', name: 'Letter to Ada', format: 'tei', xml, updatedAt: Date.now() });
const doc = await store.get('letter-1');
const all = await store.list(); // sorted by updatedAt, newest first
await store.delete('letter-1');
```

The database schema is versioned. Version 2 adds an `assets` object store for
binary files (images) — see [Assets](#assets) below.

## Assets

Graphic elements store a simple **relative path** in `url` (TEI) or `xlink:href`
(JATS), e.g. `myimage.png`. Absolute `http(s):` URLs still work as before.

To resolve and pick those paths, attach an AssetStore implementation to
the editor:

```js
import { IndexedDbAssetStore, attachAssetStore } from '@jinntec/jinntap/storage';

await attachAssetStore(editor, new IndexedDbAssetStore());
// equivalent: editor.assets = await new IndexedDbAssetStore().open();
```

With a store attached, selecting a `graphic` opens the connector panel with:

- a thumbnail grid of stored images,
- drag-and-drop / browse upload (overwrites the same filename),
- delete (with confirm) on each thumbnail,
- write-back of the relative path into the attribute.

`IndexedDbAssetStore` shares the `jinntap` IndexedDB database with documents.
A **HTTP** implementation for TEI Publisher is also available:

```js
import { attachPublisherAssetStore } from '@jinntec/jinntap/storage';

// docPath is relative to data-root; dataDefaultRel is data-default under data-root
attachPublisherAssetStore(editor, {
  contextPath: '/exist/apps/workbench',
  docPath,
  dataDefaultRel: 'annotate',
});
```

It talks to `/api/jinntap/assets` (jinntap Jinks profile). Collections and asset
ids are resolved relative to **`$config:data-default`** (not `data-root`), so a
document `annotate/essay.xml` with `data-default = …/annotate` stores
`photo.png` directly in that collection.

```js
const assets = editor.assets;
await assets.put({ path: 'photo.png', blob: file, mimeType: file.type });
const url = await assets.resolve('photo.png'); // object URL for <img>
```

### Exporting with images

When downloading a document that references local assets, hosts can offer a ZIP
(XML + image files at their relative paths) or XML alone:

```js
import {
  collectReferencedAssets,
  downloadXml,
  downloadDocumentZip,
} from '@jinntec/jinntap/storage';

const xml = editor.xml;
const filename = editor.metadata?.name || 'document.xml';
const referenced = await collectReferencedAssets(xml, editor.assets);

if (referenced.length > 0) {
  const asZip = await jinnToastConfirm(
    `Download ZIP with ${referenced.length} image(s), or XML only?`,
    { confirmLabel: 'ZIP with images', cancelLabel: 'XML only' },
  );
  if (asZip) {
    await downloadDocumentZip(xml, referenced, filename);
  } else {
    downloadXml(xml, filename);
  }
} else {
  downloadXml(xml, filename);
}
```

The documentation demo download button uses this flow.

## Example: new document with confirm

The documentation demo uses `jinnToastConfirm` for both restore and "New document":

```js
newBtn.addEventListener('click', async () => {
  const existing = await handle.getRecord();
  if (existing?.xml) {
    const ok = await jinnToastConfirm(
      'Start a new document? Your local draft will be replaced.',
      { confirmLabel: 'New document', cancelLabel: 'Cancel', type: 'warn' },
    );
    if (!ok) return;
  }
  await handle.clear();
  editor.newDocument();
});
```

See `site/_includes/partials/jinn-tap-scripts.njk` in the repository for the full
host wiring used on this site.

## When not to use it

- **TEI Publisher and other server-backed apps** already load and save documents;
  use `content-change` to POST to your backend instead.
- **Collaboration** (`server` attribute) owns live document state via Yjs; local
  IndexedDB is a separate concern and is skipped by default.
- **Private browsing** or storage quotas may limit IndexedDB; handle attach errors
  gracefully (the demo logs and continues without local save).

For the raw method signatures, see also [JavaScript API → Local document store](/api/javascript-api#local-document-store-indexeddb).
