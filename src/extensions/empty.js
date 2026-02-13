import { JinnBlock } from './block.js';

function getAttributeString(attrs) {
    return Object.entries(attrs || {})
        .map(([key, value]) => {
            if (value !== null) {
                return `${key}="${value}"`;
            }
            return '';
        })
        .join(' ');
}

/**
 * Empty element
 *
 * @param {Object} options - The options for the empty element.
 * @param {string} options.tag - The tag name for the empty element (computed from the name).
 * @param {Object} options.shortcuts - The shortcuts for the empty element.
 * @param {Object} options.attributes - The attributes for the empty element.
 * @param {string} options.label - The label for the empty element.
 */
export const JinnEmptyElement = JinnBlock.extend({
    name: 'emptyElement',
    group: 'inline',
    content: '',
    inline: true,

    addOptions() {
        return {
            prefix: 'tei-', // Default prefix, can be overridden in configure()
            shortcuts: {},
            attributes: {},
            label: 'Empty Element',
        };
    },

    parseHTML() {
        const prefix = this.options.prefix || 'tei-';
        return [
            {
                tag: `${prefix}${this.name}`,
            },
        ];
    },

    addNodeView() {
        return ({ node }) => {
            const dom = document.createElement(`tei-${this.name}`);
            dom.classList.add('empty-element');
            dom.innerHTML = this.options.label;
            // Set all attributes on the DOM element
            Object.entries(node.attrs).forEach(([key, value]) => {
                if (value) {
                    dom.setAttribute(key, value);
                }
            });

            dom.addEventListener('click', () => {
                const pos = this.editor.view.posAtDOM(dom);
                this.editor.options.element.dispatchEvent(
                    new CustomEvent('empty-element-clicked', { detail: { node, pos } }),
                );
            });
            return {
                dom,
                update: (updatedNode) => {
                    if (updatedNode.type !== node.type) {
                        return false;
                    }
                    node.attrs = updatedNode.attrs;
                    const attrString = getAttributeString(updatedNode.attrs);
                    if (attrString) {
                        dom.setAttribute('data-tooltip', attrString);
                    }
                    // Update all attributes on the DOM element
                    Object.entries(node.attrs).forEach(([key, value]) => {
                        if (value) {
                            dom.setAttribute(key, value);
                        } else {
                            dom.removeAttribute(key);
                        }
                    });
                    return true;
                },
            };
        };
    },

    addKeyboardShortcuts() {
        const shortcuts = {};
        if (this.options.shortcuts) {
            Object.entries(this.options.shortcuts).forEach(([shortcut, config]) => {
                shortcuts[shortcut] = () => {
                    return this.editor.commands.insertContent({
                        type: this.name,
                        attrs: config.attributes,
                    });
                };
            });
        }
        return shortcuts;
    },
});
