import { Extension, createNodeFromContent } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

export const JinnTapCommands = Extension.create({
    name: 'jinnTapCommands',

    addCommands() {
        return {
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
                (snippet) =>
                ({ state, commands }) => {
                    commands.insertContent({
                        type: 'figure',
                        attrs: {},
                        content: [
                            { type: 'graphic', attrs: { url: 'https://placehold.co/320x200' } },
                            { type: 'head', content: [{ type: 'text', text: 'Description' }] },
                        ],
                    });
                    return true;
                },
        };
    },
});
