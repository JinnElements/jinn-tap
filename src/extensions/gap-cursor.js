import { Extension, callOrReturn, getExtensionField } from '@tiptap/core';
import { GapCursor } from '@tiptap/pm/gapcursor';
import { TextSelection } from '@tiptap/pm/state';

/**
 * Lets the cursor leave blocks it cannot type its way out of.
 *
 * A figure (TEI `figure`, JATS `fig`) only accepts graphics and a description,
 * so a figure at the end of its parent leaves nowhere to continue the text:
 * Enter inside the description just adds another description node. ProseMirror's
 * gap cursor solves this without touching the document — it is a cursor position
 * *between* nodes, and a paragraph is only created once something is typed
 * there, so an untouched document still exports unchanged.
 *
 * Two node spec flags drive it (both set from the schema definition in
 * `createFromSchema`):
 *
 * - `createGapCursor` on the figure itself — by default a gap cursor is only
 *   offered next to atoms and isolating nodes, and a figure whose last child is
 *   a caption doesn't qualify.
 * - `allowGapCursor` on the containers a paragraph may be created in (`div`,
 *   `sec`, the document, …). ProseMirror otherwise requires the container's
 *   *default* child type to be a text block, which in a TEI/JATS schema it
 *   isn't (`div` comes first in the `block` group).
 *
 * On top of that, Enter at the end of a figure places the gap cursor after it
 * instead of appending another caption node.
 */
export const JinnGapCursor = Extension.create({
    name: 'jinnGapCursor',

    // Enter must be seen before the default splitBlock binding.
    priority: 1000,

    extendNodeSchema(extension) {
        const context = {
            name: extension.name,
            options: extension.options,
            storage: extension.storage,
        };
        return {
            createGapCursor: callOrReturn(getExtensionField(extension, 'createGapCursor', context)) ?? null,
        };
    },

    addKeyboardShortcuts() {
        return {
            Enter: () => this.editor.commands.command(({ state, dispatch }) => exitBlock(state, dispatch)),
        };
    },
});

/**
 * Enter at the very end of a node flagged with `createGapCursor`: leave the node
 * instead of splitting its last child. Places a gap cursor after the node, or —
 * if the schema doesn't allow one there — inserts a paragraph to land in.
 *
 * @param {import('@tiptap/pm/state').EditorState} state
 * @param {Function|undefined} dispatch
 * @returns {boolean}
 */
export function exitBlock(state, dispatch) {
    const { selection } = state;
    if (!selection.empty || !(selection instanceof TextSelection)) {
        return false;
    }
    const { $from } = selection;
    let depth = -1;
    for (let d = $from.depth; d > 0; d--) {
        if ($from.node(d).type.spec.createGapCursor) {
            depth = d;
            break;
        }
    }
    if (depth === -1) {
        return false;
    }
    // Only when the cursor sits at the very end of the node's content.
    if ($from.parentOffset !== $from.parent.content.size) {
        return false;
    }
    for (let d = $from.depth; d > depth; d--) {
        if ($from.index(d - 1) !== $from.node(d - 1).childCount - 1) {
            return false;
        }
    }

    const $after = state.doc.resolve($from.after(depth));
    if (GapCursor.valid($after)) {
        if (dispatch) {
            dispatch(state.tr.setSelection(new GapCursor($after)).scrollIntoView());
        }
        return true;
    }

    // No gap cursor possible here (e.g. a schema without the container flags):
    // fall back to a real paragraph so there is at least somewhere to type.
    const paragraphType = state.schema.nodes.p;
    if (!paragraphType || !$after.parent.canReplaceWith($after.index(), $after.index(), paragraphType)) {
        return false;
    }
    if (dispatch) {
        const tr = state.tr.insert($after.pos, paragraphType.create());
        dispatch(tr.setSelection(TextSelection.create(tr.doc, $after.pos + 1)).scrollIntoView());
    }
    return true;
}
