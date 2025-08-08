import { JinnEmptyElement } from './empty.js';
import { getAnchorReference } from './footnote.js';
import { Plugin, PluginKey } from '@tiptap/pm/state';

// Function to generate a unique ID
function generateUniqueId() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `fn-${timestamp}-${randomStr}`;
}

export const JinnAnchor = JinnEmptyElement.extend({
    name: 'anchor',
    group: 'inline',
    content: '', // Atomic nodes should not have content
    inline: true,
    atom: true,

    addAttributes() {
        const attributes = {
            id: {
                isRequired: true,
                type: 'string',
                renderHTML(attributes) {
                    return { id: attributes.id };
                },
                parseHTML(element) {
                    return element.getAttribute('id') || generateUniqueId();
                },
            },
            _timestamp: {
                default: null,
                renderHTML: () => ({}),
            },
            _reference: {
                default: null,
                renderHTML: () => ({}),
            },
        };
        if (this.options.attributes) {
            Object.entries(this.options.attributes).forEach(([attrName, attrDef]) => {
                attributes[attrName] = {
                    default: attrDef.default || null,
                    parseHTML: (element) => element.getAttribute(attrName),
                    renderHTML: (attributes) => {
                        if (!attributes[attrName]) {
                            return {};
                        }
                        return {
                            [attrName]: attributes[attrName],
                        };
                    },
                };
            });
        }
        return attributes;
    },

    addCommands() {
        return {
            addAnchor:
                (attributes) =>
                ({ commands }) => {
                    const id = attributes.id || generateUniqueId();
                    commands.insertContent({
                        type: this.name,
                        attrs: {
                            ...attributes,
                            id,
                        },
                    });
                    if (!attributes.id) {
                        // Copy the generated ID to clipboard
                        navigator.clipboard
                            .writeText(`#${id}`)
                            .then(() => {
                                document.dispatchEvent(
                                    new CustomEvent('jinn-toast', {
                                        detail: {
                                            message: 'Anchor ID copied to clipboard',
                                            type: 'info',
                                        },
                                    }),
                                );
                            })
                            .catch((err) => {
                                document.dispatchEvent(
                                    new CustomEvent('jinn-toast', {
                                        detail: {
                                            message: 'Failed to copy ID to clipboard',
                                            type: 'error',
                                        },
                                    }),
                                );
                            });

                        // Find the first note without a target and scroll it into view
                        const { view } = this.editor;
                        let foundNote = false;
                        view.state.doc.descendants((node, pos) => {
                            if (node.type.name === 'note' && !node.attrs.target) {
                                const noteElement = view.domAtPos(pos).node;
                                if (noteElement) {
                                    noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    // Set selection at the start of the note
                                    commands.setNodeSelection(pos + 1);
                                    this.editor.options.element.dispatchEvent(
                                        new CustomEvent('empty-element-clicked', { detail: { node, pos } }),
                                    );
                                    foundNote = true;
                                }
                                return foundNote; // Stop searching
                            }
                        });
                    }
                },
            gotoNote:
                (id) =>
                ({ commands, editor }) => {
                    const target = `#${id}`;
                    editor.view.state.doc.descendants((node, pos) => {
                        if (node.type.name === 'note' && node.attrs.target === target) {
                            const noteElement = editor.view.domAtPos(pos).node;
                            noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            commands.setNodeSelection(pos + 1);
                            return true;
                        }
                    });
                },
        };
    },

    addNodeView() {
        return ({ node, editor }) => {
            const dom = document.createElement(`tei-${this.name}`);

            // Set all attributes on the DOM element
            Object.entries(node.attrs).forEach(([key, value]) => {
                if (value) {
                    dom.setAttribute(key, value);
                }
            });

            return {
                dom,
                update: (updatedNode) => {
                    if (updatedNode.type !== node.type) {
                        return false;
                    }

                    // Update attributes
                    Object.entries(updatedNode.attrs).forEach(([key, value]) => {
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
    addProseMirrorPlugins() {
        const { editor } = this;
        return [
            new Plugin({
                key: new PluginKey('footnoteRefClick'),

                props: {
                    handleClickOn(view, pos, node, nodePos, event) {
                        if (node.type.name === 'anchor') {
                            if (event.ctrlKey || event.metaKey) {
                                // Get the reference number and set it as text content
                                const reference = getAnchorReference(node.attrs.id);
                                if (reference) {
                                    editor.commands.gotoNote(node.attrs.id);
                                }
                            } else {
                                editor.options.element.dispatchEvent(
                                    new CustomEvent('empty-element-clicked', { detail: { node, pos } }),
                                );
                            }
                            return true;
                        }
                    },
                },
            }),
        ];
    },
});
