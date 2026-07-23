/**
 * Attach an {@link AssetStore} to a `<jinn-tap>` element.
 *
 * @param {HTMLElement & { assets?: object }} editor
 * @param {import('./asset-store.js').AssetStore} store
 * @returns {Promise<import('./asset-store.js').AssetStore>}
 */
export async function attachAssetStore(editor, store) {
    if (!editor || !store) {
        throw new Error('attachAssetStore requires an editor and a store');
    }
    if (typeof store.open === 'function') {
        await store.open();
    }
    editor.assets = store;
    return store;
}
