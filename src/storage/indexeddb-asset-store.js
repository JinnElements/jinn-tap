import { openJinntapDb, idbRequest, ASSETS_STORE, DB_NAME } from './db.js';
import { isAbsoluteAssetHref, sanitizeAssetPath } from './asset-store.js';

/**
 * @typedef {import('./asset-store.js').AssetMeta} AssetMeta
 * @typedef {import('./asset-store.js').StoredAsset} StoredAsset
 */

/**
 * IndexedDB {@link AssetStore} implementation.
 * Shares the `jinntap` database with {@link DocumentStore}.
 */
export class IndexedDbAssetStore {
    /**
     * @param {string} [dbName]
     */
    constructor(dbName = DB_NAME) {
        this.dbName = dbName;
        /** @type {IDBDatabase|null} */
        this._db = null;
        /** @type {Map<string, string>} */
        this._objectUrls = new Map();
    }

    /**
     * @returns {Promise<IndexedDbAssetStore>}
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
            throw new Error('IndexedDbAssetStore is not open; call open() first');
        }
        return this._db;
    }

    /**
     * @param {IDBTransactionMode} mode
     * @returns {IDBObjectStore}
     */
    _store(mode) {
        return this._requireDb().transaction(ASSETS_STORE, mode).objectStore(ASSETS_STORE);
    }

    /**
     * @returns {Promise<AssetMeta[]>}
     */
    async list() {
        const rows = await idbRequest(this._store('readonly').getAll());
        return (rows ?? [])
            .map(({ path, mimeType, updatedAt, size }) => ({ path, mimeType, updatedAt, size }))
            .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    }

    /**
     * @param {string} path
     * @returns {Promise<StoredAsset|undefined>}
     */
    async get(path) {
        const result = await idbRequest(this._store('readonly').get(path));
        return result ?? undefined;
    }

    /**
     * Insert or replace an asset. Same `path` overwrites.
     * @param {{ path: string, blob: Blob, mimeType?: string }} asset
     * @returns {Promise<StoredAsset>}
     */
    async put(asset) {
        const path = sanitizeAssetPath(asset.path);
        if (!path) {
            throw new Error('IndexedDbAssetStore.put requires a path');
        }
        if (!asset.blob) {
            throw new Error('IndexedDbAssetStore.put requires a blob');
        }
        /** @type {StoredAsset} */
        const record = {
            path,
            blob: asset.blob,
            mimeType: asset.mimeType || asset.blob.type || 'application/octet-stream',
            updatedAt: Date.now(),
            size: asset.blob.size,
        };
        await idbRequest(this._store('readwrite').put(record));
        this._revokeCached(path);
        return record;
    }

    /**
     * @param {string} path
     * @returns {Promise<void>}
     */
    async delete(path) {
        await idbRequest(this._store('readwrite').delete(path));
        this._revokeCached(path);
    }

    /**
     * Resolve a graphic href to a displayable URL.
     * Absolute URLs pass through; relative paths load from IndexedDB.
     * @param {string} href
     * @returns {Promise<string>}
     */
    async resolve(href) {
        const trimmed = href?.trim() ?? '';
        if (!trimmed) {
            return '';
        }
        if (isAbsoluteAssetHref(trimmed)) {
            return trimmed;
        }
        const cached = this._objectUrls.get(trimmed);
        if (cached) {
            return cached;
        }
        const asset = await this.get(trimmed);
        if (!asset?.blob) {
            return trimmed;
        }
        const url = URL.createObjectURL(asset.blob);
        this._objectUrls.set(trimmed, url);
        return url;
    }

    /**
     * @param {string} url
     */
    revoke(url) {
        if (!url?.startsWith('blob:')) {
            return;
        }
        for (const [path, cached] of this._objectUrls) {
            if (cached === url) {
                URL.revokeObjectURL(url);
                this._objectUrls.delete(path);
                return;
            }
        }
        URL.revokeObjectURL(url);
    }

    _revokeCached(path) {
        const url = this._objectUrls.get(path);
        if (url) {
            URL.revokeObjectURL(url);
            this._objectUrls.delete(path);
        }
    }

    close() {
        for (const url of this._objectUrls.values()) {
            URL.revokeObjectURL(url);
        }
        this._objectUrls.clear();
        if (this._db) {
            this._db.close();
            this._db = null;
        }
    }
}
