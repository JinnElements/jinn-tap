import { DocumentStore } from './document-store.js';
import { deduceDocumentName, isGenericTitle } from './document-name.js';

/**
 * @typedef {import('./document-store.js').StoredDocument} StoredDocument
 */

/**
 * @typedef {object} AttachLocalStoreOptions
 * @property {string} [documentId] - Stable key for the active document (default: `current-<format>`)
 * @property {number} [debounceMs=500]
 * @property {DocumentStore} [store] - Reuse an existing store instance
 * @property {boolean} [force=false] - Attach even when collaboration (`server`) is active
 * @property {boolean} [autoRestore=false] - Restore immediately without asking
 * @property {(record: StoredDocument) => boolean|Promise<boolean>} [onDraftAvailable] - Called when a draft exists; return true to restore, false to discard it
 * @property {(name: string) => void} [onNameChange] - Called when the display name changes
 * @property {(record: StoredDocument) => void} [onRestore] - Called after a draft is restored
 */

/**
 * @typedef {object} LocalStoreHandle
 * @property {DocumentStore} store
 * @property {string} documentId
 * @property {boolean} restored
 * @property {StoredDocument|undefined} pendingDraft
 * @property {() => void} detach
 * @property {(record?: StoredDocument) => Promise<boolean>} restore
 * @property {(name: string) => Promise<StoredDocument>} rename
 * @property {() => Promise<void>} clear
 * @property {() => Promise<StoredDocument|undefined>} getRecord
 * @property {() => Promise<StoredDocument>} saveNow
 */

/**
 * Bind a `<jinn-tap>` editor to IndexedDB: optionally restore a local draft on ready,
 * and debounced-autosave on `content-change`.
 *
 * @param {HTMLElement & { xml: string, metadata: object, format?: string, newDocument?: Function }} editor
 * @param {AttachLocalStoreOptions} [options]
 * @returns {Promise<LocalStoreHandle|null>} `null` when skipped (e.g. collaboration without `force`)
 */
export async function attachLocalStore(editor, options = {}) {
    const { debounceMs = 500, force = false, autoRestore = false, onDraftAvailable, onNameChange, onRestore } = options;

    if (!force && editor.hasAttribute('server')) {
        return null;
    }

    const format = (editor.getAttribute('format') || editor.format || 'tei').toLowerCase();
    const documentId = options.documentId || `current-${format}`;
    const store = options.store || new DocumentStore();
    await store.open();

    let nameLocked = false;
    let currentName = 'Untitled Document';
    let timer = null;
    let detached = false;
    let restored = false;
    let suppressingSave = false;
    /** @type {StoredDocument|undefined} */
    let pendingDraft;

    const emitName = (name) => {
        currentName = name;
        onNameChange?.(name);
    };

    const buildRecord = (xml, overrides = {}) => {
        const metadata = editor.metadata || {};
        let name = currentName;
        if (!nameLocked) {
            name = deduceDocumentName({
                xml,
                metadata,
                plainText: typeof editor.content === 'string' ? editor.content : undefined,
            });
            if (!isGenericTitle(name) && metadata.title !== name) {
                editor.metadata = { ...metadata, title: name };
            }
        }
        emitName(name);
        /** @type {StoredDocument} */
        return {
            id: documentId,
            name,
            format,
            xml,
            updatedAt: Date.now(),
            nameLocked,
            filename: editor.metadata?.name,
            ...overrides,
        };
    };

    const persist = async (xml) => {
        if (detached || suppressingSave || !xml) {
            return;
        }
        const record = buildRecord(xml);
        await store.put(record);
        return record;
    };

    const scheduleSave = (xml) => {
        if (detached || suppressingSave) {
            return;
        }
        clearTimeout(timer);
        timer = setTimeout(() => {
            persist(xml).catch((err) => console.error('jinntap local store save failed', err));
        }, debounceMs);
    };

    const onContentChange = (event) => {
        scheduleSave(event.detail?.xml);
    };

    const applyRestore = async (existing) => {
        if (!existing?.xml) {
            return false;
        }
        suppressingSave = true;
        try {
            // Avoid a later url attribute change reloading remote content over the draft
            if (editor.hasAttribute('url')) {
                editor.removeAttribute('url');
            }
            editor.xml = existing.xml;
            nameLocked = Boolean(existing.nameLocked);
            const filename = existing.filename || editor.metadata?.name || 'untitled.xml';
            editor.metadata = {
                ...(editor.metadata || {}),
                title: existing.name,
                name: filename,
            };
            emitName(existing.name);
            restored = true;
            pendingDraft = undefined;
            onRestore?.(existing);
            return true;
        } finally {
            // Allow the restore-triggered content-change to settle before saving again
            setTimeout(() => {
                suppressingSave = false;
            }, debounceMs + 50);
        }
    };

    const offerRestore = async () => {
        const existing = await store.get(documentId);
        if (!existing?.xml) {
            return false;
        }
        pendingDraft = existing;

        let shouldRestore = autoRestore;
        if (!autoRestore && onDraftAvailable) {
            shouldRestore = Boolean(await onDraftAvailable(existing));
            if (!shouldRestore) {
                // User declined — drop the draft so we do not prompt again on reload
                await store.delete(documentId);
                pendingDraft = undefined;
                return false;
            }
        }

        if (shouldRestore) {
            return applyRestore(existing);
        }
        return false;
    };

    const waitUntilReady = () =>
        new Promise((resolve) => {
            if (editor._initialized || editor.editor) {
                resolve();
                return;
            }
            const onReady = () => resolve();
            editor.addEventListener('ready', onReady, { once: true });
            // Re-check in case `ready` fired between the guard and the listener
            if (editor._initialized || editor.editor) {
                editor.removeEventListener('ready', onReady);
                resolve();
            }
        });

    await waitUntilReady();
    await offerRestore();

    editor.addEventListener('content-change', onContentChange);

    return {
        store,
        documentId,
        get restored() {
            return restored;
        },
        get pendingDraft() {
            return pendingDraft;
        },
        detach() {
            detached = true;
            clearTimeout(timer);
            editor.removeEventListener('content-change', onContentChange);
        },
        async restore(record) {
            const existing = record || pendingDraft || (await store.get(documentId));
            return applyRestore(existing);
        },
        async rename(name) {
            const trimmed = name?.trim();
            if (!trimmed) {
                throw new Error('Document name must not be empty');
            }
            nameLocked = true;
            emitName(trimmed);
            editor.metadata = {
                ...(editor.metadata || {}),
                title: trimmed,
            };
            const xml = editor.xml;
            return store.put(
                buildRecord(xml, {
                    name: trimmed,
                    nameLocked: true,
                }),
            );
        },
        async clear() {
            clearTimeout(timer);
            await store.delete(documentId);
            nameLocked = false;
            emitName('Untitled Document');
        },
        async getRecord() {
            return store.get(documentId);
        },
        async saveNow() {
            clearTimeout(timer);
            return persist(editor.xml);
        },
    };
}
