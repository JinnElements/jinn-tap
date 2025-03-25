export class Toolbar {
    constructor(editor, schemaDef) {
        this.editor = editor;
        this.toolbar = document.querySelector('.toolbar');
        this.addButtons(schemaDef);
    }

    addButtons(schemaDef) {
        // Sort nodes by type - blocks and lists first, then inline nodes
        const sortedEntries = Object.entries(schemaDef).sort(([, a], [, b]) => {
            // Define type order: blocks/lists first, then inline
            const getTypeOrder = (type) => {
                if (type === 'block' || type === 'list') return 0;
                if (type === 'inline') return 1;
                return 2; // Other types
            };
            return getTypeOrder(a.type) - getTypeOrder(b.type);
        });
        sortedEntries.forEach(([name, def]) => {
            if (!def.toolbar) return;
            Object.entries(def.toolbar).forEach(([label, toolbarDef]) => {
                const button = this.createButton(label, toolbarDef);
                button.addEventListener('click', () => {
                    if (def.type === 'inline') {
                        this.editor.chain().focus().toggleMark(name, toolbarDef.attributes).run();
                    } else if (def.type === 'list') {
                        this.editor.chain().focus().toggleList(name, toolbarDef.attributes).run();
                    } else {
                        this.editor.chain().focus().setNode(name, toolbarDef.attributes).run();
                    }
                });
                this.toolbar.appendChild(button);
            });
        });
    }

    createButton(name, def) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'toolbar-button';
        
        // Add icon if specified in schema
        const icon = document.createElement('i');
        icon.className = `bi ${def.icon}`;
        button.appendChild(icon);
        
        // Add tooltip
        button.title = name.charAt(0).toUpperCase() + name.slice(1);
        
        // Add active state styling
        button.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent editor from losing focus
        });

        // Update active state based on current selection
        // this.editor.on('selectionUpdate', ({ editor }) => {
        //     button.disabled = !editor.isActive(name);
        // });

        return button;
    }
} 