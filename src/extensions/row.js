import { mergeAttributes } from '@tiptap/core'
import { Node } from '@tiptap/core'

export const JinnRow = Node.create({
    name: 'row',
    group: 'row',
    content: 'cell+',

    addOptions() {
        return {
            tag: `tei-row`,
            shortcuts: {},
            attributes: {
                role: {
                    default: null,
                },
            },
            inputRules: [],
        }
    },

    parseHTML() {
        return [
            {
                tag: this.options.tag,
            },
        ]
    },

    renderHTML({ node, HTMLAttributes }) {
        const isHeaderRow = node.attrs.role === 'label'
        // If we have a role label, we're actually a header
        return [
            isHeaderRow ? 'thead' : 'tr',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
            0,
        ]
    },

    addAttributes() {
        /**
         * @type {import('@tiptap/core/dist/types').Attributes}
         */
        const attributes = {}
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
