import { marksInRange } from './util/util.js';

export class NavigationPanel {
    constructor(editor, attributePanel) {
        this.editor = editor.tiptap;
        this.attributePanel = attributePanel;
        this.panel = editor.querySelector('.navigation-panel');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.editor.on('transaction', ({ editor, transaction }) => {
            // Skip remote transactions (from Yjs) to avoid unnecessary panel updates
            // when other users move their cursors or make changes
            const isRemoteTransaction = transaction.meta['y-sync$'] !== undefined;
            if (transaction.docChanged && !isRemoteTransaction) {
                this.updatePanelForCurrentPosition(editor);
            }
        });
        this.editor.on('selectionUpdate', ({ editor }) => {
            this.updatePanelForCurrentPosition(editor);
        });
    }

    updatePanelForCurrentPosition(editor) {
        this.panel.innerHTML = '';

        const { from, to } = editor.state.selection;
        const $pos = editor.state.doc.resolve(from);
        const node = $pos.node();
        
        // Create a list to store the node hierarchy
        const nodeHierarchy = [];
        
        // Add current node and its marks
        let marks;
        if (node) {
            // if it's a text node, collect all marks in the selection
            // if (node.isText) {
                marks = marksInRange(editor, from, to);
            // }
            // Traverse up the ancestor chain using resolve
            let depth = $pos.depth;
            
            while (depth > 0) {
                const parent = $pos.node(depth);
                if (parent) {
                    const parentInfo = {
                        type: parent.type.name,
                        node: parent,
                        pos: { from: $pos.start(depth), to: $pos.end(depth) }
                    };
                    nodeHierarchy.push(parentInfo);
                }
                depth--;
            }
        }
        
        let ul = document.createElement('ul');
        nodeHierarchy.reverse().forEach((nodeInfo, index) => {
            const li = document.createElement('li');
            const link = document.createElement('a');
            link.setAttribute('href', '#');
            link.textContent = nodeInfo.type;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                // Set selection just before and after the node
                this.editor.chain()
                    .focus()
                    .setNodeSelection(nodeInfo.pos.from - 1)
                    .run();
                this.attributePanel.updatePanel(nodeInfo.node, nodeInfo.pos.from - 1);
            });
            li.appendChild(link);
            ul.appendChild(li);
        });
        if (marks) {
            marks.forEach(mark => {
                const li = document.createElement('li');
                const link = document.createElement('a');
                link.setAttribute('href', '#');
                link.textContent = mark.mark.type.name;
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.editor.chain().focus().extendMarkRange(mark.mark.type).run();
                    this.attributePanel.updatePanel(mark.mark, from, mark.text);
                });
                li.appendChild(link);
                ul.appendChild(li);
            });
        }
        this.panel.appendChild(ul);
    }
}