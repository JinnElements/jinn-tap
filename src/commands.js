import { Extension } from '@tiptap/core';

export const JinnTapCommands = Extension.create({
    name: 'jinnTapCommands',

    addCommands() {
        return {
            moveUp: () => ({ commands }) => {
                const { from } = this.editor.state.selection;
                const $pos = this.editor.state.doc.resolve(from);
                const node = $pos.node();
                
                commands.lift(node.type, node.attrs);
            }
        };
    }
});