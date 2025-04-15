import { findParentNodeClosestToPos } from '@tiptap/core';

/**
 * Toolbar class for the editor.
 * 
 * @class Toolbar
 * @param {Object} editor - The editor instance.
 * @param {Object} schemaDef - The schema definition.
 * @param {Element} toolbarSlot - The toolbar slot element.
 */
export class Toolbar {
    /**
     * Create a new Toolbar instance.
     * 
     * @param {Object} editor - The editor instance.
     * @param {Object} schemaDef - The schema definition.
     * @param {Element} toolbarSlot - The toolbar slot element.
     */
    constructor(editor, schemaDef) {
        this.editor = editor.tiptap;
        this.toolbar = editor.querySelector('.toolbar');
        this.schemaDef = schemaDef;
        this.addButtons(schemaDef);

        // Add debug toggle button
        const debugButton = document.createElement('a');
        debugButton.href = '#';
        debugButton.dataset.tooltip = 'Toggle debug mode';
        debugButton.dataset.placement = 'bottom';
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
        const sortedEntries = Object.entries(schemaDef.schema).sort(([, a], [, b]) => {
            // Define type order: blocks/lists first, then inline
            const getTypeOrder = (type) => {
                if (type === 'block' || type === 'list' || type === 'empty') return 0;
                if (type === 'inline') return 1;
                return 2; // Other types
            };
            return getTypeOrder(a.type) - getTypeOrder(b.type);
        });

        // Create a map to store select elements
        const selectElements = new Map();

        sortedEntries.forEach(([name, def]) => {
            if (!def.toolbar) return;
            Object.entries(def.toolbar).forEach(([label, toolbarDef]) => {
                if (toolbarDef.select) {
                    // Handle select elements
                    const selectName = toolbarDef.select;
                    let select = selectElements.get(selectName);
                    if (!select) {
                        select = this.createSelect(selectName);
                        selectElements.set(selectName, select);
                        const li = document.createElement('li');
                        li.appendChild(select);
                        this.toolbar.appendChild(li);
                    }
                    this.addOptionToSelect(select, name, def, label, toolbarDef);
                } else {
                    // Handle regular buttons
                    const button = this.createButton(name, label, toolbarDef);
                    button.addEventListener('click', (ev) => {
                        ev.preventDefault();
                        this.handleNodeAction(name, def, toolbarDef);
                    });
                    const li = document.createElement('li');
                    li.appendChild(button);
                    this.toolbar.appendChild(li);
                }
            });
        });
    }

    /**
     * Perform action for a node in the toolbar.
     * 
     * @param {string} name - The name of the node.
     * @param {Object} def - The definition of the node.
     * @param {Object} toolbarDef - The definition of the toolbar item.
     */
    handleNodeAction(name, def, toolbarDef) {
        if (name === 'head') {
            // Check if we're in a list item
            const { state } = this.editor;
            const { selection } = state;
            const { $from } = selection;
            const listItem = findParentNodeClosestToPos($from, node => node.type.name === 'item');
            
            if (listItem) {
                // If in a list item, use transformToHead
                this.editor.chain().focus().transformToHead().run();
                return;
            }
        }

        if (toolbarDef.command) {
            this.editor.chain().focus()[toolbarDef.command](name, toolbarDef.attributes).run();
        } else if (def.type === 'inline') {
            this.editor.chain().focus().toggleMark(name, toolbarDef.attributes).run();
        } else if (def.type === 'list') {
            this.editor.chain().focus().toggleList(toolbarDef.attributes).run();
        } else if (def.type === 'anchor') {
            this.editor.chain().focus().addAnchor(toolbarDef.attributes).run();
        } else if (def.type === 'empty') {
            this.editor.chain().focus().insertContent({
                type: name,
                attrs: toolbarDef.attributes
            }).run();
        } else {
            this.editor.chain().focus().setNode(name, toolbarDef.attributes).run();
        }
    }

    createButton(name, label, def) {
        const button = document.createElement('a');
        button.href = '#';
        button.className = 'outline toolbar-button';
        
        // Add icon if specified in schema
        if (def.label) {
            button.innerHTML = def.label;
        }
        
        // Add tooltip
        button.dataset.tooltip = label;
        button.dataset.placement = 'bottom';
        
        // Add active state styling
        button.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent editor from losing focus
        });

        // Update active state based on current selection
        this.editor.on('selectionUpdate', ({ editor }) => {
            this.updateButtonState(button, name, def, editor);
        });

        return button;
    }

    /**
     * Update the state of a button based on the current selection.
     * 
     * @param {Element} button - The button or linkelement.
     * @param {string} name - The name of the node.
     * @param {Object} def - The definition of the node.
     * @param {Object} editor - The editor instance.
     */
    updateButtonState(button, name, def, editor) {
        const nodeType = this.schemaDef[name];
        
        if (!nodeType) return;
        
        let isValid = true;
        
        if (def.command) {
            isValid = editor.can()[def.command](name, def.attributes);
        } else if (nodeType.type === 'inline') {
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
        if (!isValid) {
            button.classList.add('disabled');
        } else {
            button.classList.remove('disabled');
        }
        button.classList.toggle('active', editor.isActive(name));
    }

    createSelect(name) {
        const select = document.createElement('details');
        select.className = 'dropdown';
        
        const summary = document.createElement('summary');
        summary.textContent = name;
        select.appendChild(summary);

        const menu = document.createElement('ul');
        select.appendChild(menu);
        return select;
    }

    addOptionToSelect(select, name, def, label, toolbarDef) {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.innerHTML = toolbarDef.label;
        link.appendChild(document.createTextNode(' ' + label));
        link.href = '#';
        li.appendChild(link);
        link.addEventListener('click', (ev) => {
            ev.preventDefault();
            select.open = false;
            this.handleNodeAction(name, def, toolbarDef);
        });

        // Update active state based on current selection
        this.editor.on('selectionUpdate', ({ editor }) => {
            this.updateButtonState(link, name, def, editor);
        });

        select.querySelector('ul').appendChild(li);
    }
} 