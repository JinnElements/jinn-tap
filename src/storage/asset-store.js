/**
 * @typedef {object} AssetMeta
 * @property {string} path - Relative path used in graphic `url` / `xlink:href` (e.g. `myimage.png`)
 * @property {string} mimeType
 * @property {number} updatedAt - Epoch ms
 * @property {number} [size] - Byte length
 */

/**
 * @typedef {AssetMeta & { blob: Blob }} StoredAsset
 */

/**
 * Pluggable asset backend for images (and later other binaries).
 *
 * Implementations must support relative paths in XML attributes. Absolute
 * `http(s):` / `data:` / `blob:` hrefs should pass through `resolve` unchanged.
 *
 * @typedef {object} AssetStore
 * @property {() => Promise<AssetStore>} [open]
 * @property {() => Promise<AssetMeta[]>} list
 * @property {(path: string) => Promise<StoredAsset|undefined>} get
 * @property {(asset: { path: string, blob: Blob, mimeType?: string }) => Promise<StoredAsset>} put
 * @property {(path: string) => Promise<void>} delete
 * @property {(href: string) => Promise<string>|string} resolve - Displayable URL for an href
 * @property {(url: string) => void} [revoke]
 * @property {() => void} [close]
 */

/**
 * @param {string} href
 * @returns {boolean}
 */
export function isAbsoluteAssetHref(href) {
    return /^(https?:|data:|blob:)/i.test(href?.trim() ?? '');
}

/**
 * Normalize an upload filename to a relative path (basename only).
 * @param {string} name
 * @returns {string}
 */
export function sanitizeAssetPath(name) {
    const base = (name || 'image').replace(/\\/g, '/').split('/').pop().trim();
    return base || 'image';
}
