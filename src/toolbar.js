export class Toolbar {
    constructor(editor, schemaDef) {
        this.editor = editor.tiptap;
        this.toolbar = editor.querySelector('.toolbar');
        this.schemaDef = schemaDef;
        this.addButtons(schemaDef);
        // Add debug toggle button
        const debugButton = document.createElement('a');
        debugButton.href = '#';
        debugButton.className = 'outline toolbar-button';
        debugButton.innerHTML = '<i class="bi bi-question-circle"></i>';
        debugButton.title = 'Toggle debug mode';
        debugButton.addEventListener('click', (ev) => {
            ev.preventDefault();
            const component = this.toolbar.closest('jinn-tap');
            if (component.hasAttribute('debug')) {
                component.removeAttribute('debug');
            } else {
                component.setAttribute('debug', '');
            }
        });
        const li = document.createElement('li'); 
        li.appendChild(debugButton);
        this.toolbar.appendChild(li);
    }

    addButtons(schemaDef) {
        // Sort nodes by type - blocks and lists first, then inline nodes
        const sortedEntries = Object.entries(schemaDef).sort(([, a], [, b]) => {
            // Define type order: blocks/lists first, then inline
            const getTypeOrder = (type) => {
                if (type === 'block' || type === 'list' || type === 'empty') return 0;
                if (type === 'inline') return 1;
                return 2; // Other types
            };
            return getTypeOrder(a.type) - getTypeOrder(b.type);
        });
        sortedEntries.forEach(([name, def]) => {
            if (!def.toolbar) return;
            Object.entries(def.toolbar).forEach(([label, toolbarDef]) => {
                const button = this.createButton(name, label, toolbarDef);
                button.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    if (toolbarDef.command) {
                        this.editor.chain().focus()[toolbarDef.command](name, toolbarDef.attributes).run();
                    } else if (def.type === 'inline') {
                        this.editor.chain().focus().toggleMark(name, toolbarDef.attributes).run();
                    } else if (def.type === 'list') {
                        this.editor.chain().focus().toggleList(name, toolbarDef.attributes).run();
                    } else if (def.type === 'anchor') {
                        this.editor.chain().focus().addAnchor(name, toolbarDef.attributes).run();
                    } else if (def.type === 'empty') {
                        this.editor.chain().focus().insertContent({
                            type: name,
                            attrs: toolbarDef.attributes
                        }).run();
                    } else {
                        this.editor.chain().focus().setNode(name, toolbarDef.attributes).run();
                    }
                });
                const li = document.createElement('li');
                li.appendChild(button);
                this.toolbar.appendChild(li);
            });
        });
    }

    createButton(name, label, def) {
        const button = document.createElement('a');
        button.href = '#';
        // button.type = 'button';
        button.className = 'outline toolbar-button';
        
        // Add icon if specified in schema
        if (def.label) {
            button.innerHTML = def.label;
        }
        
        // Add tooltip
        button.dataset.tooltip = label;
        button.dataset.placement = 'top';
        
        // Add active state styling
        button.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent editor from losing focus
        });

        // Update active state based on current selection
        this.editor.on('selectionUpdate', ({ editor }) => {
            const nodeType = this.schemaDef[name];
            
            if (!nodeType) return;
            
            let isValid = true;
            
            if (def.command) {
                isValid = editor.can()[def.command](name, def.attributes);
            }else if (nodeType.type === 'inline') {
                // For inline marks, check if they can be applied to the current selection
                isValid = editor.can().toggleMark(name, def.attributes);
            } else if (nodeType.type === 'block') {
                // For block nodes, check if they can be set at the current position
                isValid = editor.can().setNode(name, def.attributes);
            } else if (nodeType.type === 'list') {
                // For lists, check if they can be toggled
                isValid = editor.can().toggleList(name, def.attributes);
            } else if (nodeType.type === 'empty' || nodeType.type === 'anchor') {
                // For empty nodes, check if they can be inserted
                isValid = editor.can().insertContent({
                    type: name,
                    attrs: def.attributes
                });
            }
            
            button.disabled = !isValid;
            button.classList.toggle('active', editor.isActive(name));
        });

        return button;
    }
} 