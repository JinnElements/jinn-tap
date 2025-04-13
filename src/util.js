import { getMarkRange } from '@tiptap/core';

export function marksInSelection(editor) {
    const { from, to } = editor.state.selection;
    return marksInRange(editor, from, to);
}

export function marksInRange(editor, from, to) {
    // Check for marks across the entire selection
    // We only want to return the marks which are attached to every node in the selection
    let matchingMarks = null;
    editor.state.doc.nodesBetween(from, to, (node, pos, parent, index) => {
        if (node.isText) {
            if (matchingMarks == null) {
                matchingMarks = node.marks.map(mark => ({mark, pos}));
            } else {
                matchingMarks = matchingMarks.filter(mark => node.marks.find(m => m.type.name === mark.mark.type.name));
            }
        }
    });

    if (matchingMarks) {
        matchingMarks = matchingMarks.map(mark => {
            const $pos = editor.state.doc.resolve(mark.pos);
            const range = getMarkRange($pos, mark.mark.type, mark.mark.attrs);
            mark.text = editor.state.doc.textBetween(range.from, range.to, '', ' ');
            return mark;
        });
        matchingMarks.sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0));
    }
    return matchingMarks;
}