export class AttributePanel {

    constructor(editor, schemaDef) {
        this.editor = editor.tiptap;
        this.schemaDef = schemaDef;
        this.panel = editor.querySelector('.attribute-panel form');
        this.currentElement = null;
        this.currentAttributes = {};
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
        let matchingParent = null;
        editor.state.doc.nodesBetween(from, to, (node, pos, parent, index) => {
            if (matchingMark) return; // Stop if we found a mark
            
            const marks = node.marks;
            matchingMark = marks.find(mark => 
                Object.keys(this.schemaDef).includes(mark.type.name)
            );
            if (matchingMark) {
                matchingText = node.text;
                matchingParent = parent;
            }
        });
        
        if (matchingMark) {
            // Check if attributes have changed for authority fields
            const hasChanged = this.hasAuthorityAttributesChanged(matchingMark);
            if (!hasChanged && this.currentElement?.type?.name === matchingMark.type.name && 
                this.currentElement?.attrs?.id === matchingMark.attrs?.id &&
                this.currentElement?.parent?.type?.name === matchingParent?.type?.name) {
                return;
            }
            this.currentElement = matchingMark;
            this.currentElement.parent = matchingParent;
            this.currentAttributes = { ...matchingMark.attrs };
            this.showMarkAttributes(matchingMark, matchingText);
            return;
        }

        // If no marks, check for nodes
        const $pos = editor.state.doc.resolve(from);
        const node = $pos.node();
        const parent = $pos.depth > 0 ? $pos.node($pos.depth) : null;
        
        if (node && Object.keys(this.schemaDef).includes(node.type.name)) {
            // Check if attributes have changed for authority fields
            const hasChanged = this.hasAuthorityAttributesChanged(node);
            if (!hasChanged && this.currentElement?.type?.name === node.type.name && 
                this.currentElement?.attrs?.id === node.attrs?.id &&
                this.currentElement?.parent?.type?.name === parent?.type?.name) {
                return;
            }
            this.currentElement = node;
            this.currentElement.parent = parent;
            this.currentAttributes = { ...node.attrs };
            this.showNodeAttributes(node);
        } else {
            // Check parent nodes
            let depth = $pos.depth;
            while (depth > 0) {
                const parentNode = $pos.node(depth);
                const parentParent = depth > 1 ? $pos.node(depth - 1) : null;
                if (Object.keys(this.schemaDef).includes(parentNode.type.name)) {
                    // Check if attributes have changed for authority fields
                    const hasChanged = this.hasAuthorityAttributesChanged(parentNode);
                    if (!hasChanged && this.currentElement?.type?.name === parentNode.type.name && 
                        this.currentElement?.attrs?.id === parentNode.attrs?.id &&
                        this.currentElement?.parent?.type?.name === parentParent?.type?.name) {
                        return;
                    }
                    this.currentElement = parentNode;
                    this.currentElement.parent = parentParent;
                    this.currentAttributes = { ...parentNode.attrs };
                    this.showNodeAttributes(parentNode);
                    return;
                }
                depth--;
            }
            this.currentElement = null;
            this.currentAttributes = {};
            this.hidePanel();
        }
    }

    hasAuthorityAttributesChanged(element) {
        const def = this.schemaDef[element.type.name];
        if (!def || !def.attributes) return false;

        // Check each attribute that has a connector
        return Object.entries(def.attributes).some(([attrName, attrDef]) => {
            if (attrDef.connector) {
                return this.currentAttributes[attrName] !== element.attrs[attrName];
            }
            return false;
        });
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

    createAttributeInput(attrName, attrDef, currentValue, placeholder = '') {
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
        input.placeholder = placeholder;
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
            this.panel.innerHTML = '';
            return;
        }

        Object.entries(def.attributes).forEach(([attrName, attrDef]) => {
            if (attrDef.connector) {
                const input = this.createAttributeInput(
                    attrName, 
                    attrDef, 
                    nodeOrMark.attrs[attrName],
                    "No reference assigned"
                );
                input.disabled = true;

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
                    const value = `${attrDef.connector.prefix}-${event.detail.properties.ref}`;
                    input.value = value;
                    if (Object.keys(def.attributes).length === 1) {
                        this.handleAttributeUpdate(nodeOrMark, { [attrName]: value });
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

    handleAttributeUpdate(nodeOrMark, pendingChanges = {}) {
        const formData = new FormData(this.panel);
        const clearedAttributes = [];
        for (const [key, value] of formData.entries()) {
            if (value !== '') {
                pendingChanges[key] = value;
            } else {
                clearedAttributes.push(key);
            }
        }

        console.log('<jinn-tap> pendingChanges: %o, cleared: %o', pendingChanges, clearedAttributes);
        const { from, to } = this.editor.state.selection;
        this.editor.chain()
            .focus()
            .extendMarkRange(nodeOrMark.type.name)
            .run();

        if (clearedAttributes.length > 0) {
            this.editor.commands.resetAttributes(nodeOrMark.type.name, clearedAttributes);
        }

        if (Object.keys(pendingChanges).length > 0) {
            this.editor.chain()
                .focus()
                .updateAttributes(nodeOrMark.type, pendingChanges)
                .setTextSelection({ from, to })
                .run();
        }
    }
} 