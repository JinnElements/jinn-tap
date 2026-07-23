import { isAbsoluteAssetHref, sanitizeAssetPath } from './asset-store.js';

/**
 * @typedef {import('./asset-store.js').AssetMeta} AssetMeta
 * @typedef {import('./asset-store.js').StoredAsset} StoredAsset
 */

/**
 * HTTP {@link AssetStore} for TEI Publisher / Jinks (`/api/jinntap/assets`).
 *
 * Assets live under `$config:data-default`. Relative paths in `url` / `xlink:href`
 * map to `{collection}/{path}` beneath that default collection.
 */
export class HttpAssetStore {
    /**
     * @param {object} options
     * @param {string} options.contextPath - App context path (e.g. `/exist/apps/workbench`)
     * @param {string} [options.collection=''] - Subcollection relative to data-default
     * @param {string} [options.dataDefaultRel=''] - data-default path relative to data-root (e.g. `annotate`), used when deriving collection from a document path
     * @param {RequestCredentials} [options.credentials='same-origin']
     */
    constructor({
        contextPath,
        collection = '',
        dataDefaultRel = '',
        credentials = 'same-origin',
    } = {}) {
        if (!contextPath) {
            throw new Error('HttpAssetStore requires contextPath');
        }
        this.contextPath = contextPath.replace(/\/+$/, '');
        this.collection = (collection || '').replace(/^\/+|\/+$/g, '');
        this.dataDefaultRel = (dataDefaultRel || '').replace(/^\/+|\/+$/g, '');
        this.credentials = credentials;
        /** @type {Map<string, string>} */
        this._objectUrls = new Map();
    }

    /**
     * Change the collection (e.g. after saving a new document to a path).
     * @param {string} collection - Relative to data-default
     */
    setCollection(collection) {
        this.collection = (collection || '').replace(/^\/+|\/+$/g, '');
        this._revokeAll();
    }

    /**
     * Update collection from a document path (relative to data-root).
     * @param {string} docPath
     */
    setCollectionFromDoc(docPath) {
        this.setCollection(collectionFromDocPath(docPath, this.dataDefaultRel));
    }

    /**
     * Id relative to data-default for an asset path.
     * @param {string} path
     * @returns {string}
     */
    assetId(path) {
        const safe = sanitizeAssetPath(path);
        return this.collection ? `${this.collection}/${safe}` : safe;
    }

    /**
     * @param {string} path
     * @returns {string}
     */
    assetUrl(path) {
        return `${this.contextPath}/api/jinntap/assets/${encodeURIComponent(this.assetId(path))}`;
    }

    /**
     * @returns {Promise<AssetMeta[]>}
     */
    async list() {
        const url = `${this.contextPath}/api/jinntap/assets?collection=${encodeURIComponent(this.collection)}`;
        const response = await fetch(url, { credentials: this.credentials });
        if (!response.ok) {
            throw new Error(`Failed to list assets (${response.status})`);
        }
        const rows = await response.json();
        return Array.isArray(rows) ? rows : [];
    }

    /**
     * @param {string} path
     * @returns {Promise<StoredAsset|undefined>}
     */
    async get(path) {
        const response = await fetch(this.assetUrl(path), { credentials: this.credentials });
        if (response.status === 404) {
            return undefined;
        }
        if (!response.ok) {
            throw new Error(`Failed to get asset (${response.status})`);
        }
        const blob = await response.blob();
        const mimeType = blob.type || response.headers.get('content-type') || 'application/octet-stream';
        return {
            path: sanitizeAssetPath(path),
            blob,
            mimeType,
            size: blob.size,
            updatedAt: Date.now(),
        };
    }

    /**
     * @param {{ path: string, blob: Blob, mimeType?: string }} asset
     * @returns {Promise<StoredAsset>}
     */
    async put(asset) {
        const path = sanitizeAssetPath(asset.path);
        const mimeType = asset.mimeType || asset.blob.type || 'application/octet-stream';
        const response = await fetch(this.assetUrl(path), {
            method: 'PUT',
            credentials: this.credentials,
            headers: {
                'Content-Type': mimeType,
            },
            body: asset.blob,
        });
        if (!response.ok) {
            throw new Error(`Failed to store asset (${response.status})`);
        }
        const meta = await response.json().catch(() => ({}));
        this._revokeCached(path);
        return {
            path,
            blob: asset.blob,
            mimeType: meta.mimeType || mimeType,
            size: meta.size ?? asset.blob.size,
            updatedAt: meta.updatedAt ?? Date.now(),
        };
    }

    /**
     * @param {string} path
     * @returns {Promise<void>}
     */
    async delete(path) {
        const response = await fetch(this.assetUrl(path), {
            method: 'DELETE',
            credentials: this.credentials,
        });
        if (response.status === 404) {
            return;
        }
        if (!response.ok && response.status !== 204) {
            throw new Error(`Failed to delete asset (${response.status})`);
        }
        this._revokeCached(sanitizeAssetPath(path));
    }

    /**
     * Resolve to a displayable URL. Relative paths use the assets API (with cache-busting
     * via object URL when already fetched is not needed — direct API URL works for <img>).
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
        return this.assetUrl(trimmed);
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

    _revokeAll() {
        for (const url of this._objectUrls.values()) {
            URL.revokeObjectURL(url);
        }
        this._objectUrls.clear();
    }
}

/**
 * Derive the asset collection (relative to data-default) from a document path
 * (relative to data-root).
 *
 * @param {string} [docPath] - e.g. `annotate/essay.xml` or `annotate/sub/essay.xml`
 * @param {string} [dataDefaultRel=''] - data-default relative to data-root, e.g. `annotate`
 * @returns {string} e.g. `` or `sub`
 */
export function collectionFromDocPath(docPath, dataDefaultRel = '') {
    const doc = (docPath || '').replace(/^\/+|\/+$/g, '');
    const root = (dataDefaultRel || '').replace(/^\/+|\/+$/g, '');
    if (!doc) {
        return '';
    }
    let underDefault = doc;
    if (root) {
        if (doc === root || doc.startsWith(`${root}/`)) {
            underDefault = doc === root ? '' : doc.slice(root.length + 1);
        } else {
            // Outside data-default: keep assets in the default collection root
            return '';
        }
    }
    if (!underDefault.includes('/')) {
        return '';
    }
    return underDefault.split('/').slice(0, -1).join('/');
}

/**
 * Attach an {@link HttpAssetStore} to a `<jinn-tap>` editor for TEI Publisher / Jinks.
 *
 * @param {HTMLElement & { assets?: object, metadata?: { name?: string } }} editor
 * @param {{ contextPath: string, docPath?: string, dataDefaultRel?: string }} options
 * @returns {HttpAssetStore}
 */
export function attachPublisherAssetStore(
    editor,
    { contextPath, docPath = '', dataDefaultRel = '' } = {},
) {
    const collection = collectionFromDocPath(docPath, dataDefaultRel);
    const store = new HttpAssetStore({ contextPath, collection, dataDefaultRel });
    editor.assets = store;
    return store;
}
