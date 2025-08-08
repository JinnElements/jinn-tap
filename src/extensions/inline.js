import { Mark } from '@tiptap/core';

/**
 * Base inline mark
 *
 * @param {Object} options - The options for the inline mark.
 * @param {string} options.tag - The tag name for the inline mark (computed from the name).
 * @param {Object} options.shortcuts - The shortcuts for the inline mark.
 * @param {Object} options.attributes - The attributes for the inline mark.
 */
export const JinnInline = Mark.create({
    name: 'inline',

    addOptions() {
        return {
            tag: `tei-${this.name}`,
            shortcuts: {},
            attributes: {},
        };
    },

    parseHTML() {
        return [
            {
                tag: this.options.tag,
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [this.options.tag, HTMLAttributes, 0];
    },

    addAttributes() {
        const attributes = {};
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

    addKeyboardShortcuts() {
        const shortcuts = {};
        if (this.options.shortcuts) {
            Object.entries(this.options.shortcuts).forEach(([shortcut, config]) => {
                shortcuts[shortcut] = () => {
                    return this.editor.commands.toggleMark(this.name, config.attributes);
                };
            });
        }
        return shortcuts;
    },

    addCommands() {
        return {
            [`toggle${this.name.charAt(0).toUpperCase() + this.name.slice(1)}`]:
                () =>
                ({ commands, attributes }) => {
                    return commands.toggleMark(this.name, attributes);
                },
        };
    },
});
