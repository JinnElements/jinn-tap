import { JinnBlock } from './block.js';

function isAbsoluteAssetHref(href) {
    return /^(https?:|data:|blob:)/i.test(href?.trim() ?? '');
}

/**
 * @param {import('@tiptap/core').Editor} editor
 * @returns {object|null}
 */
function getAssetStore(editor) {
    const host = editor?.options?.element?.closest?.('jinn-tap');
    return host?.assets ?? null;
}

/**
 * @param {object} node
 * @returns {string}
 */
function graphicHref(node) {
    return node.attrs['xlink:href'] || node.attrs.url || '';
}

/**
 * @param {HTMLImageElement} dom
 * @param {object} node
 * @param {import('@tiptap/core').Editor} editor
 */
async function applyGraphicSrc(dom, node, editor) {
    const href = graphicHref(node);
    if (!href) {
        dom.removeAttribute('src');
        return;
    }
    if (isAbsoluteAssetHref(href)) {
        dom.src = href;
        return;
    }
    const assets = getAssetStore(editor);
    if (assets?.resolve) {
        try {
            dom.src = await assets.resolve(href);
            return;
        } catch (err) {
            console.warn('Failed to resolve graphic asset', href, err);
        }
    }
    dom.src = href;
}

export const JinnGraphic = JinnBlock.extend({
    name: 'graphic',
    content: '',
    selectable: true,
    addNodeView() {
        return ({ node, editor }) => {
            const dom = document.createElement('img');
            let generation = 0;
            let currentNode = node;

            const refresh = (n) => {
                currentNode = n;
                const gen = ++generation;
                applyGraphicSrc(dom, n, editor).then(() => {
                    // Ignore stale async resolves after a newer update
                    if (gen !== generation) {
                        return;
                    }
                });
            };

            refresh(node);

            dom.addEventListener('click', () => {
                const pos = this.editor.view.posAtDOM(dom);
                this.editor.options.element.dispatchEvent(
                    new CustomEvent('empty-element-clicked', {
                        detail: { node: currentNode, pos },
                    }),
                );
            });

            return {
                dom,
                update(updatedNode) {
                    if (updatedNode.type.name !== 'graphic') {
                        return false;
                    }
                    refresh(updatedNode);
                    return true;
                },
            };
        };
    },
});
