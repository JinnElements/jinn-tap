import { getExtensionField, callOrReturn, Node } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/extension-bubble-menu';
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

/**
 * @param {import('@tiptap/pm/state').Selection} selection
 */
const findTableAncestor = (selection) => {
    const $head = selection.$head;
    for (let d = $head.depth; d > 0; d--) {
        if ($head.node(d).type.spec.tableRole == 'table') {
            return { node: $head.node(d), pos: $head.before(d) };
        }
    }
    return null;
};

/**
 * @type {import('@tiptap/core').Command}
 */
const updateColsAndRows = ({ state, tr }, { cols: deltaCols = 0, rows: deltaRows = 0 } = {}) => {
    const tablePos = findTableAncestor(state.selection);

    if (!tablePos) {
        return;
    }

    const { node: table, pos } = tablePos;

    const rowChildren = table.children.filter((child) => child.type.spec.tableRole === 'row');

    const rows = rowChildren.length;
    // const rows = table.attrs.rows;
    const firstRow = rowChildren[0];

    const cells = [...firstRow.children].filter((child) => child.type.spec.tableRole === 'cell');
    // Note colspanning cells. They take more room. We take the
    // first row so there are no rowspanning cells 'coming from
    // above'
    const cols = cells.reduce((widthToNow, cell) => widthToNow + parseInt(cell.attrs.colspan), 0);
    //const cols = table.attrs.cols;
    if (deltaCols !== 0) {
        tr = tr.setNodeAttribute(pos, 'cols', cols + deltaCols);
    }
    if (deltaRows !== 0) {
        tr = tr.setNodeAttribute(pos, 'rows', rows + deltaRows);
    }

    return tr;
};

export const JinnTable = Node.create({
    name: 'table',
    content: 'row*',
    group: 'block',
    isolating: true,
    tableRole: 'table',

    addOptions() {
        return {
            prefix: 'tei-', // Default prefix, can be overridden in configure()
            shortcuts: {},
            attributes: {},
            inputRules: [],
            //            View: TableView,
        };
    },

    parseHTML() {
        const prefix = this.options.prefix || 'tei-';
        return [
            {
                tag: `${prefix}table`,
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
            default: null,
            parseHTML: (element) => {
                return Array.from(element.children).filter((child) => child.localName === 'tei-row').length;
            },
            renderHTML: (attrs) => {
                return attrs.rows;
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
                    (widthToNow, cell) => widthToNow + parseInt(cell.getAttribute('cols') || '1', 10),
                    0,
                );
            },
            renderHTML: (attrs) => {
                return attrs.cols;
            },
        };
        return attributes;
    },

    addCommands() {
        /**
         * @type {import('@tiptap/core').RawCommands}
         */
        const commands = {
            addColumnBefore:
                () =>
                ({ state, dispatch, editor }) => {
                    return addColumnBefore(state, (tr) =>
                        updateColsAndRows({ state, editor, dispatch, tr }, { cols: 1 }),
                    );
                },
            addColumnAfter:
                () =>
                ({ state, dispatch, editor }) => {
                    return addColumnAfter(state, (tr) =>
                        updateColsAndRows({ state, editor, dispatch, tr }, { cols: 1 }),
                    );
                },
            deleteColumn:
                () =>
                ({ state, dispatch, editor }) => {
                    return deleteColumn(state, (tr) =>
                        updateColsAndRows({ state, editor, dispatch, tr }, { cols: -1 }),
                    );
                },
            addRowBefore:
                () =>
                ({ state, dispatch, editor }) => {
                    return addRowBefore(state, (tr) => updateColsAndRows({ state, editor, dispatch, tr }, { rows: 1 }));
                },
            addRowAfter:
                () =>
                ({ state, dispatch, editor }) => {
                    return addRowAfter(state, (tr) => updateColsAndRows({ state, editor, dispatch, tr }, { rows: 1 }));
                },
            deleteRow:
                () =>
                ({ state, dispatch, editor }) => {
                    return deleteRow(state, (tr) => updateColsAndRows({ state, editor, dispatch, tr }, { rows: -1 }));
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
                ({ state, dispatch, editor }) => {
                    if (mergeCells(state, dispatch)) {
                        return updateColsAndRows({ state, editor, dispatch });
                    }

                    return splitCell(state, dispatch) && updateColsAndRows({ state, editor, dispatch });
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

        return commands;
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
                options: {
                    offset: 50,
                    // Place at the bottom to prevent it from overlapping with the toolbar
                    // TODO: redo the HTML structure there to prevent this from happening at all
                    placement: 'bottom',
                    shift: true,
                },
                shouldShow: ({ editor }) => {
                    const isTableActive = editor.isActive('table');
                    return isTableActive;
                },
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
