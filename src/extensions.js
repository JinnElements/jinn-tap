import { Mark, Node } from '@tiptap/core'

/**
 * Create nodes and marks from a schema definition.
 * 
 * @param {Object} schemaDef - The schema definition
 * @returns {Array} - nodes and marks
 */
export function createFromSchema(schemaDef) {
    return Object.entries(schemaDef).map(([name, def]) => {
        let NodeOrMark; 
        if (def.type === 'inline') {
            NodeOrMark = TeiInline.extend({
                name: name
            });
        } else if (def.type === 'empty') {
            NodeOrMark = TeiEmptyElement.extend({
                name: name
            });
        } else if (def.type === 'list') {
            NodeOrMark = TeiList.extend({
                name: name
            });
        } else if (def.type === 'listItem') {
            NodeOrMark = TeiItem.extend({
                name: name
            });
        } else if (def.type === 'block') {
            NodeOrMark = TeiBlock.extend({
                name: name,
                group: def.group || 'block',
                defining: def.defining,
                priority: def.priority,
                inline: def.inline,
                content: def.content
            });
        }
        return NodeOrMark.configure({
            shortcuts: def.keyboard,
            attributes: def.attributes,
            label: def.label
        });
    });
}

// Base inline mark for TEI
export const TeiInline = Mark.create({
    name: 'inline',

    addOptions() {
        return {
            tag: `tei-${this.name}`,
            shortcuts: {},
            attributes: {}
        }
    },

    parseHTML() {
        return [
            {
                tag: this.options.tag
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return [this.options.tag, HTMLAttributes, 0]
    },

    addAttributes() {
        const attributes = {};
        if (this.options.attributes) {
            Object.entries(this.options.attributes).forEach(([attrName, attrDef]) => {
                attributes[attrName] = {
                    default: attrDef.default || null,
                    parseHTML: element => element.getAttribute(attrName),
                    renderHTML: attributes => {
                        if (!attributes[attrName]) {
                            return {}
                        }
                        return {
                            [attrName]: attributes[attrName],
                        }
                    },
                };
            });
        }
        return attributes;
    },

    addKeyboardShortcuts() {
        const shortcuts = {};
        if (this.options.shortcuts) {
            Object.entries(this.options.shortcuts).forEach(([shortcut, attributes]) => {
                shortcuts[shortcut] = () => {
                    return this.editor.commands.toggleMark(this.name, attributes);
                }
            });
        }
        return shortcuts;
    },

    addCommands() {
        return {
            [`toggle${this.name.charAt(0).toUpperCase() + this.name.slice(1)}`]: () => ({ commands, attributes }) => {
                return commands.toggleMark(this.name, attributes);
            }
        }
    }
});

export const TeiBlock = Node.create({
    name: 'block',
    group: 'block',
    content: 'inline*',

    addOptions() {
        return {
            tag: `tei-${this.name}`,
            shortcuts: {},
            attributes: {}
        }
    },

    parseHTML() {
        return [
            {
                tag: this.options.tag
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return [this.options.tag, HTMLAttributes, 0]
    },

    addAttributes() {
        const attributes = {};
        if (this.options.attributes) {
            Object.entries(this.options.attributes).forEach(([attrName, attrDef]) => {
                attributes[attrName] = {
                    default: attrDef.default || null,
                    parseHTML: element => element.getAttribute(attrName),
                    renderHTML: attributes => {
                        if (!attributes[attrName]) {
                            return {}
                        }
                        return {
                            [attrName]: attributes[attrName],
                        }
                    },
                };
            });
        }
        return attributes;
    },

    addKeyboardShortcuts() {
        const shortcuts = {};
        if (this.options.shortcuts) {
            Object.entries(this.options.shortcuts).forEach(([shortcut, attributes]) => {
                shortcuts[shortcut] = () => {
                    return this.editor.commands.setNode(this.name, attributes);
                }
            });
        }
        return shortcuts;
    },

    addCommands() {
        return {
            [`set${this.name.charAt(0).toUpperCase() + this.name.slice(1)}`]: () => ({ commands, attributes }) => {
                return commands.setNode(this.name, attributes);
            }
        }
    }
});

export const TeiList = TeiBlock.extend({
    name: 'list',
    content: 'item+',
    group: 'block',
    defining: true,
    inline: false,
    
    addCommands() {
        return {}
    },

    addKeyboardShortcuts() {
        const shortcuts = {};
        if (this.options.shortcuts) {
            Object.entries(this.options.shortcuts).forEach(([shortcut, attributes]) => {
                shortcuts[shortcut] = () => {
                    return this.editor.commands.toggleList(this.name, 'item', attributes);
                }
            });
        }
        return shortcuts;
    }
});

export const TeiItem = TeiBlock.extend({
    name: 'item',
    content: 'block*',
    group: 'item',
    addKeyboardShortcuts() {
        return {
            Enter: () => this.editor.commands.splitListItem(this.name),
            Tab: () => this.editor.commands.sinkListItem(this.name),
            'Shift-Tab': () => this.editor.commands.liftListItem(this.name)
        };
    }
});

export const TeiEmptyElement = TeiBlock.extend({
    name: 'emptyElement',
    group: 'inline',
    content: '',
    inline: true,

    addOptions() {
        return {
            label: 'Empty Element'
        }
    },

    addNodeView() {
        return ({ node }) => {
            const dom = document.createElement(`tei-${this.name}`);
            dom.classList.add('empty-element');
            dom.innerHTML = this.options.label;
            return {
                dom,
                update: (updatedNode) => {
                    if (updatedNode.type !== node.type) {
                        return false;
                    }
                    return true;
                }
            }
        }
    },

    addKeyboardShortcuts() {
        const shortcuts = {};
        if (this.options.shortcuts) {
            Object.entries(this.options.shortcuts).forEach(([shortcut, attributes]) => {
                shortcuts[shortcut] = () => {
                    return this.editor.commands.insertContent({
                        type: this.name,
                        attrs: attributes
                    });
                }
            });
        }
        return shortcuts;
    }
});