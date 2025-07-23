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
            tag: `tei-cell`,
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
        return [
            {
                tag: this.options.tag,
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
        attributes.rows = {
            default: null,
            parseHTML: (element) => {
                if (!element.hasAttribute('rows')) {
                    return null;
                }
                return parseInt(element.getAttribute('rows'), 10);
            },
            renderHTML: (attributes) => (attributes.rows === 1 ? {} : { rowspan: attributes.rows }),
        };

        // Same for `cols` vs `colspan`
        attributes.cols = {
            default: null,
            parseHTML: (element) => {
                if (!element.hasAttribute('cols')) {
                    return null;
                }
                return parseInt(element.getAttribute('cols'), 10);
            },
            renderHTML: (attributes) => (attributes.cols === 1 ? {} : { colspan: attributes.cols }),
        };

        // But they are also needed for TipTap to determine table sizes. Just don't write those back.
        attributes.rowspan = {
            default: null,
            // When we parse XML to HTML, set it to the rows attribute
            parseHTML: (element) => {
                if (!element.hasAttribute('rows')) {
                    return null;
                }
                return parseInt(element.getAttribute('rows'), 10);
            },
            renderHTML: (attributes) => {
                attributes.rowspan = attributes.rows ?? 1;
                return attributes.rowspan;
            },
        };

        // Same for `cols` vs `colspan`
        attributes.colspan = {
            default: null,
            // When we parse HTML back to XML, empty it
            parseHTML: (element) => {
                if (!element.hasAttribute('cols')) {
                    return 1;
                }
                return parseInt(element.getAttribute('cols'), 10);
            },
            // A bit of a hack: tiptap assumes an internal attribute 'colspan'
            // set to whatever the colspan is. But we use cols internally. Write
            // it to the attributes
            renderHTML: (attributes) => {
                attributes.colspan = attributes.cols ?? 1;
                return attributes.colspan;
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
