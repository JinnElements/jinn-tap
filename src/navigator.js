import { marksInRange } from './util.js';

export class NavigationPanel {
    constructor(editor, attributePanel) {
        this.editor = editor.tiptap;
        this.attributePanel = attributePanel;
        this.panel = editor.querySelector('.navigation-panel');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.editor.on('selectionUpdate', ({ editor }) => {
            this.updatePanelForCurrentPosition(editor);
        });
    }

    updatePanelForCurrentPosition(editor) {
        this.panel.innerHTML = '';

        const { from, to } = editor.state.selection;
        const node = editor.state.doc.nodeAt(from);
        
        // Create a list to store the node hierarchy
        const nodeHierarchy = [];
        
        // Add current node and its marks
        let marks;
        if (node) {
            // if it's a text node, collect all marks in the selection
            if (node.isText) {
                marks = marksInRange(editor, from, to);
            }
            // Traverse up the ancestor chain using resolve
            let pos = from;
            let depth = editor.state.doc.resolve(pos).depth;
            const resolvedPos = editor.state.doc.resolve(pos);
            
            while (depth > 0) {
                const parent = resolvedPos.node(depth);
                if (parent) {
                    const parentInfo = {
                        type: parent.type.name,
                        node: parent,
                        pos: { from: resolvedPos.start(depth), to: resolvedPos.end(depth) }
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
                    .setTextSelection({ from: nodeInfo.pos.from - 1, to: nodeInfo.pos.to + 1 })
                    .run();
                this.attributePanel.showNodeAttributes(nodeInfo.node);
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
                    this.attributePanel.showMarkAttributes(mark.mark, mark.text);
                });
                li.appendChild(link);
                ul.appendChild(li);
            });
        }
        this.panel.appendChild(ul);
    }
}