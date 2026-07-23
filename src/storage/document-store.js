import { openJinntapDb, idbRequest, DOCUMENTS_STORE, DB_NAME } from './db.js';

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
 * Shares the `jinntap` database with {@link IndexedDbAssetStore}.
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
        this._db = await openJinntapDb(this.dbName);
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
     * @param {string} id
     * @returns {Promise<StoredDocument|undefined>}
     */
    async get(id) {
        const result = await idbRequest(this._store('readonly').get(id));
        return result ?? undefined;
    }

    /**
     * @returns {Promise<StoredDocument[]>}
     */
    async list() {
        const docs = await idbRequest(this._store('readonly').getAll());
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
        await idbRequest(this._store('readwrite').put(record));
        return record;
    }

    /**
     * @param {string} id
     * @returns {Promise<void>}
     */
    async delete(id) {
        await idbRequest(this._store('readwrite').delete(id));
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
