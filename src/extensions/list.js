import { findParentNodeClosestToPos } from '@tiptap/core';
import { JinnBlock } from './block.js';

export const JinnList = JinnBlock.extend({
    name: 'list',
    content: 'head? item+',
    group: 'block',
    defining: true,
    inline: false,
    
    addCommands() {
        const ucName = this.name.charAt(0).toUpperCase() + this.name.slice(1);
        return {
            [`toggle${ucName}`]: (attributes) => ({ commands, editor }) => {
                const { state } = editor;
                const { selection } = state;
                const { $from } = selection;
                
                // Check if we're in a list
                const list = findParentNodeClosestToPos($from, node => node.type.name === this.name);
                if (list) {
                    return commands.liftListItem(this.name);
                }
                
                return commands.wrapInList(this.name, attributes);
            },
            [`transformToHead`]: () => ({ commands, state, tr }) => {
                const { selection } = state;
                const { $from } = selection;
                
                // Check if we're in a list item
                const listItem = findParentNodeClosestToPos($from, node => node.type.name === 'item');
                if (!listItem) return false;
                
                // Check if we're the first item in the list
                const list = findParentNodeClosestToPos($from, node => node.type.name === 'list');
                if (!list) return false;
                
                const isFirstItem = list.node.firstChild === listItem.node;
                if (!isFirstItem) return false;
                
                // Get the content from the paragraph inside the item
                const paragraph = listItem.node.firstChild;
                if (!paragraph) return false;
                
                // Create a new head node with the content from the paragraph
                const headNode = state.schema.nodes.head.create(
                    {},
                    paragraph.content
                );
                
                // Replace the item with the head node
                tr.replaceWith(listItem.pos, listItem.pos + listItem.node.nodeSize, headNode);
                return true;
            }
        }
    },

    addKeyboardShortcuts() {
        const shortcuts = {};
        if (this.options.shortcuts) {
            Object.entries(this.options.shortcuts).forEach(([shortcut, config]) => {
                const ucName = this.name.charAt(0).toUpperCase() + this.name.slice(1);
                shortcuts[shortcut] = () => {
                    return this.editor.commands[`toggle${ucName}`](this.name);
                }
            });
        }
        return shortcuts;
    }
});

export const JinnItem = JinnBlock.extend({
    name: 'item',
    content: 'p block*',
    group: 'item',
    defining: false,

    addKeyboardShortcuts() {
        return {
            Enter: () => {
                const { state } = this.editor;
                const { selection } = state;
                const { $from } = selection;
                
                // Get the current list item node
                const listItem = $from.node();
                
                // If we're at the start of an empty list item
                if ($from.parentOffset === 0 && listItem.content.size === 0) {
                    return this.editor.commands.liftListItem(this.name);
                }
                
                // If we're at the end of a list item
                // if ($from.parentOffset === listItem.content.size) {
                    return this.editor.commands.splitListItem(this.name);
                // }
            },
            Tab: () => this.editor.commands.sinkListItem(this.name),
            'Shift-Tab': () => this.editor.commands.liftListItem(this.name),
            'Mod-Alt-1': () => this.editor.commands.transformToHead()
        };
    }
}); 