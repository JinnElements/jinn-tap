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
                ({ commands, editor }) => {
                    const id = attributes.id || generateUniqueId();
                    const noteName = this.options.noteName || 'note';
                    const anchorName = this.options.anchorName || 'anchor';
                    const linkDirection = this.options.linkDirection || 'note-to-anchor';

                    // Detect an orphan note before insert so we can select it after FootnoteRules reconnects
                    let hadOrphan = false;
                    if (!attributes.id) {
                        editor.state.doc.descendants((node) => {
                            if (node.type.name !== noteName) return;
                            if (linkDirection === 'note-to-anchor') {
                                if (!node.attrs.target) {
                                    hadOrphan = true;
                                    return false;
                                }
                            } else {
                                const noteId = node.attrs.id;
                                if (!noteId) {
                                    hadOrphan = true;
                                    return false;
                                }
                                let hasAnchor = false;
                                editor.state.doc.descendants((anchorNode) => {
                                    if (anchorNode.type.name !== anchorName) return;
                                    const rid = anchorNode.attrs.rid || anchorNode.attrs.target;
                                    if (rid) {
                                        const ridId = rid.startsWith('#') ? rid.substring(1) : rid;
                                        if (ridId === noteId) {
                                            hasAnchor = true;
                                            return false;
                                        }
                                    }
                                });
                                if (!hasAnchor) {
                                    hadOrphan = true;
                                    return false;
                                }
                            }
                        });
                    }

                    commands.insertContent({
                        type: this.name,
                        attrs: {
                            ...attributes,
                            id,
                        },
                    });

                    // After reconnect, select the linked note once the insert+FootnoteRules
                    // transaction has landed (view.state is still stale inside this command).
                    if (!attributes.id && hadOrphan) {
                        const editorRef = this.editor;
                        const element = this.editor.options.element;
                        queueMicrotask(() => {
                            const { view, state } = editorRef;
                            let notePos = null;
                            state.doc.descendants((node, pos) => {
                                let isLinked = false;
                                if (linkDirection === 'note-to-anchor') {
                                    isLinked = node.type.name === noteName && node.attrs.target === `#${id}`;
                                } else if (node.type.name === noteName && node.attrs.id) {
                                    let rid = null;
                                    state.doc.descendants((anchorNode) => {
                                        if (anchorNode.type.name === anchorName && anchorNode.attrs.id === id) {
                                            rid = anchorNode.attrs.rid || anchorNode.attrs.target;
                                            return false;
                                        }
                                    });
                                    if (rid) {
                                        const ridId = rid.startsWith('#') ? rid.substring(1) : rid;
                                        isLinked = node.attrs.id === ridId;
                                    }
                                }
                                if (!isLinked) return;
                                notePos = pos;
                                return false;
                            });
                            if (notePos == null) return;

                            editorRef.commands.setNodeSelection(notePos);
                            element.dispatchEvent(
                                new CustomEvent('empty-element-clicked', {
                                    detail: { node: state.doc.nodeAt(notePos), pos: notePos },
                                }),
                            );
                            document.dispatchEvent(
                                new CustomEvent('jinn-toast', {
                                    detail: {
                                        message: 'Linked to existing footnote',
                                        type: 'info',
                                    },
                                }),
                            );

                            // Defer scroll so it wins over focus/caret scroll from the insert chain.
                            setTimeout(() => {
                                const { view: v } = editorRef;
                                try {
                                    v.dispatch(v.state.tr.scrollIntoView());
                                } catch (_) {
                                    /* ignore */
                                }
                                let dom = v.nodeDOM(notePos);
                                if (!dom || dom.nodeType !== 1) {
                                    const at = v.domAtPos(notePos);
                                    dom = at.node.nodeType === 1 ? at.node : at.node.parentElement;
                                }
                                if (dom?.scrollIntoView) {
                                    dom.scrollIntoView({ block: 'center' });
                                }
                            }, 50);
                        });
                    }
                },
            gotoNote:
                (id) =>
                ({ commands, editor }) => {
                    const noteName = this.options.noteName || 'note';
                    const anchorName = this.options.anchorName || 'anchor';
                    const linkDirection = this.options.linkDirection || 'note-to-anchor';

                    if (linkDirection === 'note-to-anchor') {
                        const target = `#${id}`;
                        editor.view.state.doc.descendants((node, pos) => {
                            if (node.type.name === noteName && node.attrs.target === target) {
                                const noteElement = editor.view.domAtPos(pos).node;
                                noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                commands.setNodeSelection(pos + 1);
                                return true;
                            }
                        });
                    } else {
                        // JATS: id is the xref's id — resolve via rid to the fn
                        let noteId = null;
                        editor.view.state.doc.descendants((node) => {
                            if (node.type.name === anchorName && node.attrs.id === id) {
                                const rid = node.attrs.rid || node.attrs.target;
                                if (rid) {
                                    noteId = rid.startsWith('#') ? rid.substring(1) : rid;
                                }
                                return false;
                            }
                        });
                        if (!noteId) return;
                        editor.view.state.doc.descendants((node, pos) => {
                            if (node.type.name === noteName && node.attrs.id === noteId) {
                                const noteElement = editor.view.domAtPos(pos).node;
                                noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                commands.setNodeSelection(pos + 1);
                                return true;
                            }
                        });
                    }
                },
        };
    },

    addNodeView() {
        return ({ node, editor }) => {
            const prefix = this.options.prefix || 'tei-';
            const dom = document.createElement(`${prefix}${this.name}`);

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
        const options = this.options;
        return [
            new Plugin({
                key: new PluginKey('footnoteRefClick'),

                props: {
                    handleClickOn(view, pos, node, nodePos, event) {
                        // Use the anchorName from options if available, fallback to 'anchor'
                        const anchorName = options.anchorName || 'anchor';
                        if (node.type.name === anchorName) {
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
