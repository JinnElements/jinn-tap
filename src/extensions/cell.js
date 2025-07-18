import { mergeAttributes } from '@tiptap/core'
import { Node } from '@tiptap/core'

export const JinnCell = Node.create({
    name: 'cell',
    group: 'cell',
    content: 'inline+',

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
        }
    },

    parseHTML() {
        return [
            {
                tag: this.options.tag,
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'td',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
            0,
        ]
    },
    addAttributes() {
        /**
         * @type {import('@tiptap/core/dist/types').Attributes}
         */
        const attributes = {}
        // Translate the TEI attribute `rows` to its HTML counterpart: `rowspan`
        attributes.rows = {
            default: null,
            parseHTML: (element) => element.getAttribute('rows'),
            renderHTML: (attributes) => ({ rowspan: attributes.rows }),
        }

        // Same for `cols` vs `colspan`
        attributes.cols = {
            default: null,
            parseHTML: (element) => element.getAttribute('cols'),
            renderHTML: (attributes) => ({ colspan: attributes.cols }),
        }

        // Apply default attributes
        if (this.options.attributes) {
            Object.entries(this.options.attributes).forEach(
                ([attrName, attrDef]) => {
                    attributes[attrName] = {
                        default: attrDef.default || null,
                        parseHTML: (element) => element.getAttribute(attrName),
                        renderHTML: (attributes) => {
                            if (!attributes[attrName]) {
                                return {}
                            }
                            return {
                                [attrName]: attributes[attrName],
                            }
                        },
                    }
                }
            )
        }

        return attributes
    },
})
