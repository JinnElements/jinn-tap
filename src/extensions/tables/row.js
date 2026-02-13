import { mergeAttributes } from '@tiptap/core';
import { Node } from '@tiptap/core';

export const JinnRow = Node.create({
    name: 'row',
    group: 'row',
    content: 'cell+',
    tableRole: 'row',

    addOptions() {
        return {
            prefix: 'tei-', // Default prefix, can be overridden in configure()
            shortcuts: {},
            attributes: {
                role: {
                    default: null,
                },
                'data-preceding-pb': {
                    default: null,
                },
            },
            inputRules: [],
        };
    },

    parseHTML() {
        const prefix = this.options.prefix || 'tei-';
        return [
            {
                tag: `${prefix}row`,
            },
        ];
    },

    renderHTML({ node, HTMLAttributes }) {
        const isHeaderRow = node.attrs.role === 'label';
        // If we have a role label, we're actually a header
        return [isHeaderRow ? 'thead' : 'tr', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },

    addAttributes() {
        /**
         * @type {import('@tiptap/core/dist/types').Attributes}
         */
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
});
