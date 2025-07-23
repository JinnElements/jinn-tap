import { getExtensionField } from '@tiptap/core';
import { callOrReturn, Node } from '@tiptap/core';

import BubbleMenu from '@tiptap/extension-bubble-menu';

import {
    addColumnAfter,
    addColumnBefore,
    addRowAfter,
    addRowBefore,
    CellSelection,
    deleteColumn,
    deleteRow,
    deleteTable,
    fixTables,
    goToNextCell,
    mergeCells,
    setCellAttr,
    splitCell,
    tableEditing,
    toggleHeader,
    toggleHeaderCell,
} from '@tiptap/pm/tables';

export const JinnTable = Node.create({
    name: 'table',
    content: 'heading* row*',
    group: 'block',
    isolating: true,
    tableRole: 'table',

    addOptions() {
        return {
            tag: `tei-table`,
            shortcuts: {},
            attributes: {},
            inputRules: [],
            //            View: TableView,
        };
    },

    parseHTML() {
        return [
            {
                tag: this.options.tag,

                getAttrs: (node) => {
                    return {
                        rowspan: node.getAttribute('rows'),
                        colspan: node.getAttribute('cols'),
                    };
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['table', HTMLAttributes, 0];
    },

    addAttributes() {
        /**
         * @type {import('@tiptap/core/dist/types').Attributes}
         */
        const attributes = {};
        attributes.rows = {
            parseHTML: (element) => {
                const rowChildren = [...element.children].filter((child) => child.localName === 'tei-row');

                return rowChildren.length;
            },
            renderHTML: () => {
                // `rows` is of no use in HTML
                return null;
            },
        };
        attributes.cols = {
            default: null,
            parseHTML: (element) => {
                const firstRow = [...element.children].find((child) => child.localName === 'tei-row');

                if (!firstRow) {
                    return null;
                }

                const cells = [...firstRow.children].filter((child) => child.localName === 'tei-cell');
                // Note colspanning cells. They take more room. We take the
                // first row so there are no rowspanning cells 'coming from
                // above'
                return cells.reduce(
                    (widthToNow, cell) => widthToNow + parseInt(cell.getAttribute('cols') || '1', 0),
                    0,
                );
            },
            renderHTML: () => {
                // `cols` is of no use in HTML
                return null;
            },
        };
        return attributes;
    },

    addCommands() {
        return {
            insertTable:
                ({ rows = 3, cols = 3, withHeaderRow = true } = {}) =>
                ({ tr, dispatch, editor }) => {
                    const node = createTable(editor.schema, rows, cols, withHeaderRow);

                    if (dispatch) {
                        const offset = tr.selection.from + 1;

                        tr.replaceSelectionWith(node)
                            .scrollIntoView()
                            .setSelection(TextSelection.near(tr.doc.resolve(offset)));
                    }

                    return true;
                },
            addColumnBefore:
                () =>
                ({ state, dispatch }) => {
                    return addColumnBefore(state, dispatch);
                },
            addColumnAfter:
                () =>
                ({ state, dispatch }) => {
                    return addColumnAfter(state, dispatch);
                },
            deleteColumn:
                () =>
                ({ state, dispatch }) => {
                    return deleteColumn(state, dispatch);
                },
            addRowBefore:
                () =>
                ({ state, dispatch }) => {
                    return addRowBefore(state, dispatch);
                },
            addRowAfter:
                () =>
                ({ state, dispatch }) => {
                    return addRowAfter(state, dispatch);
                },
            deleteRow:
                () =>
                ({ state, dispatch }) => {
                    return deleteRow(state, dispatch);
                },
            deleteTable:
                () =>
                ({ state, dispatch }) => {
                    return deleteTable(state, dispatch);
                },
            mergeCells:
                () =>
                ({ state, dispatch }) => {
                    return mergeCells(state, dispatch);
                },
            splitCell:
                () =>
                ({ state, dispatch }) => {
                    return splitCell(state, dispatch);
                },
            toggleHeaderColumn:
                () =>
                ({ state, dispatch }) => {
                    return toggleHeader('column')(state, dispatch);
                },
            toggleHeaderRow:
                () =>
                ({ state, dispatch }) => {
                    return toggleHeader('row')(state, dispatch);
                },
            toggleHeaderCell:
                () =>
                ({ state, dispatch }) => {
                    return toggleHeaderCell(state, dispatch);
                },
            mergeOrSplit:
                () =>
                ({ state, dispatch }) => {
                    if (mergeCells(state, dispatch)) {
                        return true;
                    }

                    return splitCell(state, dispatch);
                },
            setCellAttribute:
                (name, value) =>
                ({ state, dispatch }) => {
                    return setCellAttr(name, value)(state, dispatch);
                },
            goToNextCell:
                () =>
                ({ state, dispatch }) => {
                    return goToNextCell(1)(state, dispatch);
                },
            goToPreviousCell:
                () =>
                ({ state, dispatch }) => {
                    return goToNextCell(-1)(state, dispatch);
                },
            fixTables:
                () =>
                ({ state, dispatch }) => {
                    if (dispatch) {
                        fixTables(state);
                    }

                    return true;
                },
            setCellSelection:
                (position) =>
                ({ tr, dispatch }) => {
                    if (dispatch) {
                        const selection = CellSelection.create(tr.doc, position.anchorCell, position.headCell);

                        // @ts-ignore
                        tr.setSelection(selection);
                    }

                    return true;
                },
        };
    },

    addKeyboardShortcuts() {
        return {
            Tab: () => {
                if (this.editor.commands.goToNextCell()) {
                    return true;
                }

                if (!this.editor.can().addRowAfter()) {
                    return false;
                }

                return this.editor.chain().addRowAfter().goToNextCell().run();
            },
            'Shift-Tab': () => this.editor.commands.goToPreviousCell(),
        };
    },

    addExtensions() {
        return [
            BubbleMenu.configure({
                element: document.querySelector('.table-menu'),
                shouldShow: ({ editor }) => editor.isActive('table'),
                updateDelay: 1000000,
            }),
        ];
    },

    extendNodeSchema(extension) {
        const context = {
            name: extension.name,
            options: extension.options,
            storage: extension.storage,
        };

        return {
            tableRole: callOrReturn(getExtensionField(extension, 'tableRole', context)),
        };
    },

    addProseMirrorPlugins() {
        return [
            tableEditing({
                allowTableNodeSelection: true,
            }),
        ];
    },
});
