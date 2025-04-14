import { Node } from '@tiptap/core';

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
            }
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
            Object.entries(this.options.shortcuts).forEach(([shortcut, config]) => {
                if (!config.command) {
                    shortcuts[shortcut] = () => {
                        return this.editor.commands.setNode(this.name, config.attributes);
                    };
                } else {
                    shortcuts[shortcut] = () => {
                        return this.editor.commands[config.command](this.name, config.attributes);
                    };
                }
            });
        }
        return shortcuts;
    },

    addCommands() {
        const ucName = this.name.charAt(0).toUpperCase() + this.name.slice(1);
        return {
            [`set${ucName}`]: () => ({ commands, attributes }) => {
                return commands.setNode(this.name, attributes);
            },
            [`wrap${ucName}`]: () => ({ commands, attributes }) => {
                return commands.wrapIn(this.name, attributes);
            },
            [`lift${ucName}`]: () => ({ commands, attributes }) => {
                return commands.lift(this.name, attributes);
            }
        }
    }
}); 