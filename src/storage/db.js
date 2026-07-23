export const DB_NAME = 'jinntap';
export const DB_VERSION = 2;
export const DOCUMENTS_STORE = 'documents';
export const ASSETS_STORE = 'assets';

/**
 * @param {IDBDatabase} db
 * @param {number} oldVersion
 */
export function upgradeJinntapDb(db, oldVersion) {
    if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
        const store = db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('format', 'format', { unique: false });
    }
    if (oldVersion < 2 && !db.objectStoreNames.contains(ASSETS_STORE)) {
        const store = db.createObjectStore(ASSETS_STORE, { keyPath: 'path' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('mimeType', 'mimeType', { unique: false });
    }
}

/**
 * Open the shared `jinntap` IndexedDB database (documents + assets).
 *
 * @param {string} [dbName]
 * @returns {Promise<IDBDatabase>}
 */
export function openJinntapDb(dbName = DB_NAME) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, DB_VERSION);
        request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = /** @type {IDBOpenDBRequest} */ (event.target).result;
            upgradeJinntapDb(db, event.oldVersion);
        };
    });
}

/**
 * @template T
 * @param {IDBRequest<T>} request
 * @returns {Promise<T>}
 */
export function idbRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    });
}
