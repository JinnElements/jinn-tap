import { TeiBlock } from './block.js';

function getAttributeString(attrs) {
    return Object.entries(attrs || {})
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
}

export const TeiEmptyElement = TeiBlock.extend({
    name: 'emptyElement',
    group: 'inline',
    content: '',
    inline: true,

    addOptions() {
        return {
            tag: `tei-${this.name}`,
            shortcuts: {},
            attributes: {},
            defaultContent: [],
            label: 'Empty Element'
        }
    },

    parseHTML() {
        return [
            {
                tag: this.options.tag
            }
        ]
    },

    addNodeView() {
        return ({ node }) => {
            const dom = document.createElement(`tei-${this.name}`);
            dom.classList.add('empty-element');
            dom.innerHTML = this.options.label;
            const attrString = getAttributeString(node.attrs);
            if (attrString) {
                dom.setAttribute('data-tooltip', attrString);
            }
            // Set all attributes on the DOM element
            Object.entries(node.attrs).forEach(([key, value]) => {
                if (value) {
                    dom.setAttribute(key, value);
                }
            });
            
            dom.addEventListener('click', () => {
                this.editor.options.element.dispatchEvent(new CustomEvent('empty-element-clicked', { detail: { node } }));
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
                }
            }
        }
    },

    addKeyboardShortcuts() {
        const shortcuts = {};
        if (this.options.shortcuts) {
            Object.entries(this.options.shortcuts).forEach(([shortcut, config]) => {
                shortcuts[shortcut] = () => {
                    return this.editor.commands.insertContent({
                        type: this.name,
                        attrs: config.attributes
                    });
                }
            });
        }
        return shortcuts;
    }
}); 