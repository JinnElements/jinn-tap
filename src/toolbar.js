import { findParentNodeClosestToPos } from '@tiptap/core';

/**
 * Toolbar class for the editor.
 * 
 * @class Toolbar
 * @param {Object} editor - The editor instance.
 * @param {Object} schemaDef - The schema definition.
 */
export class Toolbar {
    /**
     * Create a new Toolbar instance.
     * 
     * @param {Object} editor - The editor instance.
     * @param {Object} schemaDef - The schema definition.
     */
    constructor(editor, schemaDef) {
        this.editor = editor.tiptap;
        this.toolbar = editor.querySelector('.toolbar');
        this.schemaDef = schemaDef;
        this.selectElements = new Map();

        // Collect all toolbar items
        const allItems = [];
        const selectItems = new Map();

        // Add global toolbar items
        if (schemaDef.toolbar) {
            Object.entries(schemaDef.toolbar).forEach(([name, def]) => {
                if (def.select) {
                    if (!selectItems.has(def.select)) {
                        selectItems.set(def.select, []);
                    }
                    selectItems.get(def.select).push({ name, def, isGlobal: true });
                    // Add select to all items if not already added
                    if (!allItems.some(item => item.type === 'select' && item.name === def.select)) {
                        allItems.push({
                            type: 'select',
                            name: def.select,
                            order: this.schemaDef.selects[def.select]?.order ?? 0
                        });
                    }
                } else {
                    allItems.push({ 
                        type: 'button',
                        name,
                        def,
                        isGlobal: true,
                        order: def.order ?? 0
                    });
                }
            });
        }

        // Add node-specific toolbar items
        Object.entries(schemaDef.schema).forEach(([name, def]) => {
            if (!def.toolbar) return;
            Object.entries(def.toolbar).forEach(([label, toolbarDef]) => {
                if (toolbarDef.select) {
                    if (!selectItems.has(toolbarDef.select)) {
                        selectItems.set(toolbarDef.select, []);
                    }
                    selectItems.get(toolbarDef.select).push({ name, def, label, toolbarDef, isGlobal: false });
                    // Add select to all items if not already added
                    if (!allItems.some(item => item.type === 'select' && item.name === toolbarDef.select)) {
                        allItems.push({
                            type: 'select',
                            name: toolbarDef.select,
                            order: this.schemaDef.selects[toolbarDef.select]?.order ?? 0
                        });
                    }
                } else {
                    allItems.push({ 
                        type: 'button',
                        name,
                        def,
                        label,
                        toolbarDef,
                        isGlobal: false,
                        order: toolbarDef.order ?? 0
                    });
                }
            });
        });

        // Sort all items by order
        const sortedItems = allItems.sort((a, b) => a.order - b.order);

        // Create toolbar items in order
        sortedItems.forEach(item => {
            if (item.type === 'select') {
                const selectDef = this.schemaDef.selects[item.name];
                const select = this.createSelect(selectDef?.label || item.name);
                this.selectElements.set(item.name, select);
                const li = document.createElement('li');
                li.appendChild(select);
                this.toolbar.appendChild(li);

                // Add items to select
                selectItems.get(item.name).forEach(selectItem => {
                    if (selectItem.isGlobal) {
                        this.addOptionToSelect(select, selectItem.name, selectItem.def, selectItem.name, selectItem.def);
                    } else {
                        this.addOptionToSelect(select, selectItem.name, selectItem.def, selectItem.label, selectItem.toolbarDef);
                    }
                });
            } else {
                if (item.isGlobal) {
                    const button = this.createButton(item.name, item.name, item.def);
                    button.addEventListener('click', (ev) => {
                        ev.preventDefault();
                        if (item.def.command) {
                            if (item.def.args) {
                                this.editor.chain().focus()[item.def.command](...item.def.args).run();
                            } else {
                                this.editor.chain().focus()[item.def.command]().run();
                            }
                        }
                    });
                    const li = document.createElement('li');
                    li.appendChild(button);
                    this.toolbar.appendChild(li);
                } else {
                    const button = this.createButton(item.name, item.label, item.toolbarDef);
                    button.addEventListener('click', (ev) => {
                        ev.preventDefault();
                        this.handleNodeAction(item.name, item.def, item.toolbarDef);
                    });
                    const li = document.createElement('li');
                    li.appendChild(button);
                    this.toolbar.appendChild(li);
                }
            }
        });

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

        const chain = this.editor.chain().focus();
        if (toolbarDef.command) {
            chain[toolbarDef.command](name, toolbarDef.attributes);
        } else if (def.type === 'inline') {
            chain.toggleMark(name, toolbarDef.attributes);
        } else if (def.type === 'list') {
            chain.toggleList(toolbarDef.attributes);
        } else if (def.type === 'anchor') {
            chain.addAnchor(toolbarDef.attributes);
        } else if (def.type === 'empty' || def.type === 'graphic') {
            chain.insertContent({
                type: name,
                attrs: toolbarDef.attributes
            });
        } else {
            // Check if the node's content model is a textBlock
            const nodeType = this.editor.schema.nodes[name];
            if (nodeType && nodeType.isTextblock) {
                chain.setNode(name, toolbarDef.attributes);
            } else {
                chain.wrapIn(name, toolbarDef.attributes);
            }
        }

        chain.run();
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
        summary.innerHTML = name;
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