const DB_NAME = 'jinntap';
const DB_VERSION = 1;
const DOCUMENTS_STORE = 'documents';

/**
 * @typedef {object} StoredDocument
 * @property {string} id
 * @property {string} name - Human-readable display title
 * @property {string} format - `'tei'` | `'jats'`
 * @property {string} xml - Full document XML
 * @property {number} updatedAt - Epoch ms
 * @property {boolean} [nameLocked] - When true, autosave will not overwrite `name`
 * @property {string} [filename] - Optional download filename (`metadata.name`)
 */

/**
 * Thin IndexedDB wrapper for local JinnTap documents.
 * Schema versioning leaves room for a future `assets` object store.
 */
export class DocumentStore {
    /**
     * @param {string} [dbName]
     */
    constructor(dbName = DB_NAME) {
        this.dbName = dbName;
        /** @type {IDBDatabase|null} */
        this._db = null;
    }

    /**
     * Open (or create) the database.
     * @returns {Promise<DocumentStore>}
     */
    async open() {
        if (this._db) {
            return this;
        }
        this._db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, DB_VERSION);
            request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = /** @type {IDBOpenDBRequest} */ (event.target).result;
                if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
                    const store = db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' });
                    store.createIndex('updatedAt', 'updatedAt', { unique: false });
                    store.createIndex('format', 'format', { unique: false });
                }
                // Future: assets object store in a later DB_VERSION
            };
        });
        return this;
    }

    /**
     * @returns {IDBDatabase}
     */
    _requireDb() {
        if (!this._db) {
            throw new Error('DocumentStore is not open; call open() first');
        }
        return this._db;
    }

    /**
     * @param {IDBTransactionMode} mode
     * @returns {IDBObjectStore}
     */
    _store(mode) {
        return this._requireDb().transaction(DOCUMENTS_STORE, mode).objectStore(DOCUMENTS_STORE);
    }

    /**
     * @template T
     * @param {IDBRequest<T>} request
     * @returns {Promise<T>}
     */
    _request(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
        });
    }

    /**
     * @param {string} id
     * @returns {Promise<StoredDocument|undefined>}
     */
    async get(id) {
        const result = await this._request(this._store('readonly').get(id));
        return result ?? undefined;
    }

    /**
     * @returns {Promise<StoredDocument[]>}
     */
    async list() {
        const docs = await this._request(this._store('readonly').getAll());
        return (docs ?? []).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    }

    /**
     * Insert or replace a document record.
     * @param {StoredDocument} doc
     * @returns {Promise<StoredDocument>}
     */
    async put(doc) {
        if (!doc?.id) {
            throw new Error('DocumentStore.put requires a document with an id');
        }
        /** @type {StoredDocument} */
        const record = {
            ...doc,
            updatedAt: doc.updatedAt ?? Date.now(),
        };
        await this._request(this._store('readwrite').put(record));
        return record;
    }

    /**
     * @param {string} id
     * @returns {Promise<void>}
     */
    async delete(id) {
        await this._request(this._store('readwrite').delete(id));
    }

    /**
     * Close the database connection.
     */
    close() {
        if (this._db) {
            this._db.close();
            this._db = null;
        }
    }
}
