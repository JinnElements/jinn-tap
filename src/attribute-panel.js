export class AttributePanel {
    constructor(editor, schemaDef) {
        this.editor = editor;
        this.schemaDef = schemaDef;
        this.currentNode = null;
        this.currentMark = null;
        this.panel = this.createPanel();
        this.setupEventListeners();
    }

    createPanel() {
        const panel = document.getElementById('attribute-panel');
        if (!panel) {
            console.error('Could not find element with id "attribute-panel"');
            return;
        }
        return panel;
    }

    setupEventListeners() {
        // Listen for selection changes
        this.editor.on('selectionUpdate', ({ editor }) => {
            this.updatePanelForCurrentPosition(editor);
        });

        // Listen for content changes
        this.editor.on('transaction', ({ editor }) => {
            this.updatePanelForCurrentPosition(editor);
        });
    }

    updatePanelForCurrentPosition(editor) {
        const { from, to } = editor.state.selection;
        
        // Check for marks across the entire selection
        let matchingMark = null;
        editor.state.doc.nodesBetween(from, to, (node, pos, parent, index) => {
            if (matchingMark) return; // Stop if we found a mark
            
            const marks = node.marks;
            matchingMark = marks.find(mark => 
                Object.keys(this.schemaDef).includes(mark.type.name)
            );
        });
        
        if (matchingMark) {
            this.showMarkAttributes(matchingMark);
            return;
        }

        // If no marks, check for nodes
        const $pos = editor.state.doc.resolve(from);
        const node = $pos.node();
        
        if (node && Object.keys(this.schemaDef).includes(node.type.name)) {
            this.showNodeAttributes(node);
        } else {
            // Check parent nodes
            let depth = $pos.depth;
            while (depth > 0) {
                const parentNode = $pos.node(depth);
                if (Object.keys(this.schemaDef).includes(parentNode.type.name)) {
                    this.showNodeAttributes(parentNode);
                    return;
                }
                depth--;
            }
            this.hidePanel();
        }
    }

    showMarkAttributes(mark) {
        this.currentMark = mark;
        this.currentNode = null;
        this.updatePanel();
    }

    showNodeAttributes(node) {
        this.currentNode = node;
        this.currentMark = null;
        this.updatePanel();
    }

    hidePanel() {
        this.currentNode = null;
        this.currentMark = null;
        this.updatePanel();
    }

    updatePanel() {
        if (!this.panel) return;
        
        this.panel.innerHTML = '';
        
        if (!this.currentNode && !this.currentMark) {
            this.panel.innerHTML = '<p>Select text or a node to edit attributes</p>';
            return;
        }

        const element = this.currentNode || this.currentMark;
        const def = this.schemaDef[element.type.name];
        
        if (!def || !def.attributes) {
            this.panel.innerHTML = '<p>No attributes available</p>';
            return;
        }

        const title = document.createElement('h3');
        title.textContent = `Attributes`;
        this.panel.appendChild(title);

        Object.entries(def.attributes).forEach(([attrName, attrDef]) => {
            const container = document.createElement('div');
            container.style.marginBottom = '15px';

            const label = document.createElement('label');
            label.textContent = attrName;
            label.style.display = 'block';
            label.style.marginBottom = '5px';
            container.appendChild(label);

            let input;
            if (attrDef.enum) {
                input = document.createElement('select');
                attrDef.enum.forEach(value => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = value;
                    input.appendChild(option);
                });
            } else {
                input = document.createElement('input');
                input.type = 'text';
            }

            input.value = element.attrs[attrName] || attrDef.default || '';
            input.style.width = '100%';
            input.style.padding = '5px';
            input.style.border = '1px solid #ccc';
            input.style.borderRadius = '4px';

            input.addEventListener('change', () => {
                const value = input.value;
                if (this.currentNode) {
                    this.editor.chain()
                        .focus()
                        .updateAttributes(this.currentNode.type.name, { [attrName]: value })
                        .run();
                } else if (this.currentMark) {
                    this.editor.chain()
                        .focus()
                        .updateAttributes(this.currentMark.type.name, { [attrName]: value })
                        .run();
                }
            });

            container.appendChild(input);
            this.panel.appendChild(container);
        });
    }
} 