import { Extension, createNodeFromContent, getMarkRange } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

/**
 * Determine the range clear formatting should operate on if the selection is empty:
 * the smallest inline element (mark) enclosing the cursor, or - if the cursor is not
 * inside any inline element - the enclosing text block.
 *
 * @param {import('@tiptap/pm/model').ResolvedPos} $pos
 * @returns {{from: number, to: number} | null}
 */
function enclosingRange($pos) {
    let range = null;
    $pos.marks().forEach((mark) => {
        const markRange = getMarkRange($pos, mark.type, mark.attrs);
        if (markRange && (!range || markRange.to - markRange.from < range.to - range.from)) {
            range = markRange;
        }
    });
    if (range) {
        return range;
    }
    return $pos.parent.isTextblock ? { from: $pos.start(), to: $pos.end() } : null;
}

export const JinnTapCommands = Extension.create({
    name: 'jinnTapCommands',

    addCommands() {
        /**
         *
         * @type {import('@tiptap/core').AnyCommands}
         */
        const commands = {
            togglePreventTyping:
                () =>
                ({ view, dispatch }) => {
                    if (dispatch) {
                        view.dom.closest('jinn-tap').toggleAttribute('block-typing');
                    }

                    return view.dom.closest('jinn-tap').hasAttribute('block-typing');
                },
            /**
             * Remove all marks from the selection. Unlike Tiptap's `unsetAllMarks` this also
             * works without a selection: the operation is then applied to the innermost inline
             * element surrounding the cursor, falling back to the enclosing text block.
             */
            clearFormatting:
                () =>
                ({ state, tr, dispatch }) => {
                    const { selection } = state;
                    let { from, to } = selection;
                    if (selection.empty) {
                        const range = enclosingRange(selection.$from);
                        if (!range) {
                            return false;
                        }
                        ({ from, to } = range);
                    }
                    if (from === to) {
                        // nothing to clear, but still drop pending marks for the next input
                        if (dispatch && state.storedMarks?.length) {
                            tr.setStoredMarks([]);
                            return true;
                        }
                        return false;
                    }
                    if (dispatch) {
                        tr.removeMark(from, to);
                        tr.setStoredMarks([]);
                    }
                    return true;
                },
            moveUp:
                () =>
                ({ commands, state }) => {
                    const { from } = state.selection;
                    const $pos = state.doc.resolve(from);
                    const node = $pos.node();

                    commands.lift(node.type, node.attrs);
                },
            insertSnippet:
                (snippet) =>
                ({ state, dispatch }) => {
                    const { from, to } = state.selection;
                    const selectedText = state.doc.textBetween(from, to);
                    let processedSnippet = snippet;
                    let count = 0;

                    // Process the snippet to replace markers
                    if (snippet.includes('{')) {
                        const markerRegex = /\{([^}]*)\}/g;
                        let match;
                        let lastIndex = 0;
                        let newText = '';

                        while ((match = markerRegex.exec(snippet)) !== null) {
                            newText += snippet.slice(lastIndex, match.index);
                            const replacementText = count === 0 ? selectedText || match[1] : match[1];
                            newText += replacementText;
                            lastIndex = match.index + match[0].length;

                            count++;
                        }
                        newText += snippet.slice(lastIndex);
                        processedSnippet = newText;
                    }

                    // Create and apply the transaction
                    const content = createNodeFromContent(processedSnippet, state.schema);
                    const tr = state.tr;
                    tr.replaceWith(from, to, content);

                    const mappedTo = tr.mapping.map(to);
                    tr.doc.nodesBetween(from, mappedTo, (node, pos) => {
                        if (node.type.name === 'text' && node.text !== selectedText) {
                            tr.setSelection(TextSelection.create(tr.doc, pos, pos + node.nodeSize));
                        }
                    });

                    if (dispatch) {
                        dispatch(tr);
                    }
                    return true;
                },
            insertFigure:
                () =>
                ({ state, commands }) => {
                    // Use 'fig' and 'caption' for JATS, 'figure' and 'head' for TEI
                    const figNodeType = state.schema.nodes.fig;
                    const captionNodeType = state.schema.nodes.caption;

                    const containerNodeType = figNodeType ? 'fig' : 'figure';
                    const descriptionNodeType = captionNodeType ? 'caption' : 'head';
                    const placeholder = 'https://placehold.co/320x200';
                    const graphicAttrs = figNodeType ? { 'xlink:href': placeholder } : { url: placeholder };

                    // JATS caption is `p+`; TEI head/figDesc are `inline*`
                    const descSpec = state.schema.nodes[descriptionNodeType]?.spec?.content || 'inline*';
                    const descriptionText = { type: 'text', text: 'Description' };
                    const descriptionContent = /\binline\b/.test(descSpec)
                        ? [descriptionText]
                        : [{ type: 'p', content: [descriptionText] }];

                    commands.insertContent({
                        type: containerNodeType,
                        attrs: {},
                        content: [
                            { type: 'graphic', attrs: graphicAttrs },
                            { type: descriptionNodeType, content: descriptionContent },
                        ],
                    });
                    return true;
                },
        };

        return commands;
    },
});
