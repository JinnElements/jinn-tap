import { Node, textblockTypeInputRule, wrappingInputRule } from '@tiptap/core';

export const TeiBlock = Node.create({
    name: 'block',
    group: 'block',
    content: 'inline*',

    addOptions() {
        return {
            tag: `tei-${this.name}`,
            shortcuts: {},
            attributes: {},
            inputRules: []
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
            [`wrap${ucName}`]: () => ({ commands, attributes }) => {
                return commands.wrapIn(this.name, attributes);
            }
        }
    },

    addInputRules() {
        if (!this.options.inputRules || this.options.inputRules.length === 0) {
            return [];
        }
        return this.options.inputRules.map(rule => {
            if (rule.type === 'textblock') {
                return textblockTypeInputRule({
                    find: new RegExp(rule.find),
                    type: this.type,
                    getAttributes: () => {
                        return rule.attributes || {};
                    }
                });
            } else if (rule.type === 'wrapping') {
                return wrappingInputRule({
                    find: new RegExp(rule.find),
                    type: this.type,
                    keepMarks: true,
                    keepAttributes: false,
                    getAttributes: () => {
                        return rule.attributes || {};
                    },
                    editor: this.editor
                });
            }
        });
    }
}); 