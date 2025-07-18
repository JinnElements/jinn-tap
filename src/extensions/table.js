import { Node } from '@tiptap/core'

export const JinnTable = Node.create({
    name: 'table',
    content: 'heading* row*',
    group: 'block',
    isolating: true,

    addOptions() {
        return {
            tag: `tei-table`,
            shortcuts: {},
            attributes: {},
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

    renderHTML({ HTMLAttributes }) {
        return ['table', HTMLAttributes, 0]
    },

    addAttributes() {
        /**
         * @type {import('@tiptap/core/dist/types').Attributes}
         */
        const attributes = {}
        attributes.rows = {
            parseHTML: (element) => {
                const rowChildren = [...element.children].filter((child) => child.localName === 'tei-row')

                return rowChildren.length
            },
            renderHTML: () => {
                // `rows` is of no use in HTML
                return null
            },
        }
        attributes.cols = {
            default: null,
            parseHTML: (element) => {
                const firstRow = [...element.children].find((child) => child.localName === 'tei-row')

                if (!firstRow) {
                    return null
                }

                const cells = [...firstRow.children].filter((child) => child.localName === 'tei-cell')
                // Note colspanning cells. They take more room. We take the
                // first row so there are no rowspanning cells 'coming from
                // above'
                return cells.reduce((widthToNow, cell) => widthToNow + parseInt(cell.getAttribute('cols') || '1', 0), 0)
            },
            renderHTML: () => {
                // `cols` is of no use in HTML
                return null
            },
        }
        return attributes
    },
})
