import { zipSync, strToU8 } from 'fflate';
import { isAbsoluteAssetHref } from './asset-store.js';

/**
 * @typedef {import('./asset-store.js').AssetStore} AssetStore
 * @typedef {import('./asset-store.js').StoredAsset} StoredAsset
 */

/**
 * Collect relative graphic hrefs from a TEI/JATS XML string
 * (`url` and `xlink:href` on any element — typically `graphic`).
 *
 * @param {string} xml
 * @returns {string[]} Unique relative paths, document order
 */
export function findReferencedAssetPaths(xml) {
    if (!xml || typeof xml !== 'string') {
        return [];
    }
    try {
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        if (doc.querySelector('parsererror')) {
            return [];
        }
        const seen = new Set();
        /** @type {string[]} */
        const paths = [];
        for (const el of doc.getElementsByTagName('*')) {
            for (const attr of ['url', 'href']) {
                // Prefer getAttributeNS for xlink:href; also plain 'href' / 'url'
                let value = null;
                if (attr === 'href') {
                    value =
                        el.getAttributeNS?.('http://www.w3.org/1999/xlink', 'href') ||
                        el.getAttribute('xlink:href') ||
                        el.getAttribute('href');
                } else {
                    value = el.getAttribute(attr);
                }
                const trimmed = value?.trim();
                if (!trimmed || isAbsoluteAssetHref(trimmed) || seen.has(trimmed)) {
                    continue;
                }
                seen.add(trimmed);
                paths.push(trimmed);
            }
        }
        return paths;
    } catch {
        return [];
    }
}

/**
 * Resolve which referenced paths exist in the asset store.
 *
 * @param {string} xml
 * @param {AssetStore} store
 * @returns {Promise<StoredAsset[]>}
 */
export async function collectReferencedAssets(xml, store) {
    if (!store?.get) {
        return [];
    }
    const paths = findReferencedAssetPaths(xml);
    /** @type {StoredAsset[]} */
    const found = [];
    for (const path of paths) {
        const asset = await store.get(path);
        if (asset?.blob) {
            found.push(asset);
        }
    }
    return found;
}

/**
 * Trigger a browser download for a Blob.
 *
 * @param {Blob} blob
 * @param {string} filename
 */
export function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * @param {string} xmlFilename
 * @returns {string}
 */
export function zipFilenameForXml(xmlFilename) {
    const base = (xmlFilename || 'document.xml').replace(/\.xml$/i, '');
    return `${base || 'document'}.zip`;
}

/**
 * Download XML alone.
 *
 * @param {string} xml
 * @param {string} [filename='document.xml']
 */
export function downloadXml(xml, filename = 'document.xml') {
    const blob = new Blob([xml], { type: 'application/xml' });
    triggerDownload(blob, filename);
}

/**
 * Build a ZIP with the XML document and referenced assets (paths preserved).
 *
 * @param {string} xml
 * @param {StoredAsset[]} assets
 * @param {string} [xmlFilename='document.xml']
 * @returns {Promise<Blob>}
 */
export async function buildDocumentZip(xml, assets, xmlFilename = 'document.xml') {
    /** @type {Record<string, Uint8Array>} */
    const files = {
        [xmlFilename]: strToU8(xml),
    };
    for (const asset of assets) {
        const path = asset.path.replace(/^\/+/, '');
        if (!path || path === xmlFilename) {
            continue;
        }
        files[path] = new Uint8Array(await asset.blob.arrayBuffer());
    }
    const zipped = zipSync(files, { level: 6 });
    // Copy into a fresh ArrayBuffer-backed Uint8Array for Blob typing
    const copy = new Uint8Array(zipped.byteLength);
    copy.set(zipped);
    return new Blob([copy.buffer], { type: 'application/zip' });
}

/**
 * Download XML + assets as a ZIP archive.
 *
 * @param {string} xml
 * @param {StoredAsset[]} assets
 * @param {string} [xmlFilename='document.xml']
 */
export async function downloadDocumentZip(xml, assets, xmlFilename = 'document.xml') {
    const blob = await buildDocumentZip(xml, assets, xmlFilename);
    triggerDownload(blob, zipFilenameForXml(xmlFilename));
}
