export class AttributePanel {

    constructor(editor, schemaDef) {
        this.editor = editor.tiptap;
        this.schemaDef = schemaDef;
        this.panel = editor.querySelector('.attribute-panel form');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for selection changes
        this.editor.on('selectionUpdate', ({ editor }) => {
            this.updatePanelForCurrentPosition(editor);
        });

        // Listen for content changes
        this.editor.on('update', ({ editor }) => {
            this.updatePanelForCurrentPosition(editor);
        });

        this.editor.options.element.addEventListener('empty-element-clicked', ({ detail }) => {
            this.showNodeAttributes(detail.node);
        });
    }

    updatePanelForCurrentPosition(editor) {
        const { from, to } = editor.state.selection;
        
        // Check for marks across the entire selection
        let matchingMark = null;
        let matchingText = null;
        editor.state.doc.nodesBetween(from, to, (node, pos, parent, index) => {
            if (matchingMark) return; // Stop if we found a mark
            
            const marks = node.marks;
            matchingMark = marks.find(mark => 
                Object.keys(this.schemaDef).includes(mark.type.name)
            );
            if (matchingMark) {
                matchingText = node.text;
            }
        });
        
        if (matchingMark) {
            this.showMarkAttributes(matchingMark, matchingText);
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

    showMarkAttributes(mark, text) {
        this.updatePanel(mark, text);
    }

    showNodeAttributes(node) {
        this.updatePanel(node);
    }

    hidePanel() {
        this.updatePanel();
    }

    createAttributeInput(attrName, attrDef, currentValue) {
        const label = document.createElement('label');
        label.textContent = attrName;

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
        input.value = currentValue || attrDef.default || '';
        input.name = attrName;

        label.appendChild(input);
        this.panel.appendChild(label);
        return input;
    }

    updatePanel(nodeOrMark, text) {
        if (!this.panel) return;
        
        this.panel.innerHTML = '';
        
        if (!nodeOrMark) {
            this.panel.innerHTML = '<p>Select text or a node to edit attributes</p>';
            return;
        }

        const def = this.schemaDef[nodeOrMark.type.name];
        
        if (!def || !def.attributes) {
            this.panel.innerHTML = '<p>No attributes available</p>';
            return;
        }

        Object.entries(def.attributes).forEach(([attrName, attrDef]) => {
            if (attrDef.connector) {
                const input = this.createAttributeInput(
                    attrName, 
                    attrDef, 
                    nodeOrMark.attrs[attrName]
                );

                const info = document.createElement('div');
                this.panel.appendChild(info);

                const lookup = document.createElement('pb-authority-lookup');
                lookup.setAttribute('type', attrDef.connector.type);
                lookup.setAttribute('query', text);
                lookup.setAttribute('auto', nodeOrMark.attrs[attrName] ? 'true' : 'false');
                lookup.setAttribute('no-occurrences', true);
                const authority = document.createElement('pb-authority');
                authority.setAttribute('connector', attrDef.connector.name);
                authority.setAttribute('name', attrDef.connector.type);
                if (attrDef.connector.user) {
                    authority.setAttribute('user', attrDef.connector.user);
                }
                lookup.appendChild(authority);

                document.addEventListener('pb-authority-select', (event) => {
                    input.value = `${attrDef.connector.prefix}-${event.detail.properties.ref}`;
                    if (Object.keys(def.attributes).length === 1) {
                        setTimeout(() => this.handleAttributeUpdate(nodeOrMark));
                    }
                });
                this.panel.appendChild(lookup);

                if (nodeOrMark.attrs[attrName]) {
                    const ref = nodeOrMark.attrs[attrName].split('-')[1];
                    lookup.lookup(attrDef.connector.type, ref, info);
                }
            } else {
                this.createAttributeInput(
                    attrName, 
                    attrDef, 
                    nodeOrMark.attrs[attrName]
                );
            }
        });

        // Add Apply button if there are attributes
        // Skip button if only one attribute and it has a connector
        if (Object.keys(def.attributes).length > 0 && 
            !(Object.keys(def.attributes).length === 1 && def.attributes[Object.keys(def.attributes)[0]].connector)) {
            const applyButton = document.createElement('button');
            applyButton.dataset.tooltip = 'Apply Changes';
            applyButton.type = 'submit';
            applyButton.innerHTML = '<i class="bi bi-check-all"></i>';
            applyButton.addEventListener('click', (ev) => {
                ev.preventDefault();
                this.handleAttributeUpdate(nodeOrMark);
            });
            this.panel.appendChild(applyButton);
        }
    }

    handleAttributeUpdate(nodeOrMark) {
        const formData = new FormData(this.panel);
        const pendingChanges = {};
        for (const [key, value] of formData.entries()) {
            pendingChanges[key] = value;
        }
        console.log(pendingChanges);
        if (Object.keys(pendingChanges).length > 0) {
            this.editor.chain()
                .focus()
                .updateAttributes(nodeOrMark.type.name, pendingChanges)
                .run();
        }
    }
} 