import { mergeAttributes } from '@tiptap/core';
import { Node } from '@tiptap/core';

export const JinnCell = Node.create({
    name: 'cell',
    group: 'cell',
    content: 'inline*',
    // Technically header cell OR normal cell, but that depends on attributes of the ancestry
    tableRole: 'cell',

    isolating: true,

    addOptions() {
        return {
            prefix: 'tei-', // Default prefix, can be overridden in configure()
            attributes: {
                ana: {
                    default: null,
                },
                role: {
                    default: null,
                },
            },
        };
    },

    parseHTML() {
        const prefix = this.options.prefix || 'tei-';
        return [
            {
                tag: `${prefix}cell`,
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['td', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
    addAttributes() {
        /**
         * @type {import('@tiptap/core/dist/types').Attributes}
         */
        const attributes = {};
        // Translate the TEI attribute `rows` to its HTML counterpart: `rowspan`
        attributes.rowspan = {
            default: 1,
            parseHTML: (element) => {
                if (!element.hasAttribute('rows')) {
                    return 1;
                }
                return parseInt(element.getAttribute('rows'), 10);
            },
            renderHTML: (attributes) => {
                attributes.rows = attributes.rowspan === 1 ? null : attributes.rowspan;
                return {
                    rowspan: attributes.rowspan,
                };
            },
        };

        // Same for `cols` vs `colspan`
        attributes.colspan = {
            default: 1,
            parseHTML: (element) => {
                if (!element.hasAttribute('cols')) {
                    return 1;
                }
                return parseInt(element.getAttribute('cols'), 10);
            },
            renderHTML: (attributes) => {
                attributes.cols = attributes.colspan === 1 ? null : attributes.colspan;
                return {
                    colspan: attributes.colspan,
                };
            },
        };

        // Apply default attributes
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
