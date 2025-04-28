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
                const button = this.createButton(item.name, item.isGlobal ? item.name : item.label, item.isGlobal ? item.def : (item.toolbarDef || item.def));
                button.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    this.nodeAction(item.name, item.def, item.toolbarDef || item.def);
                });
                const li = document.createElement('li');
                li.appendChild(button);
                this.toolbar.appendChild(li);
            }
        });

        // Update active state based on current selection
        this.editor.on('selectionUpdate', this.updateButtonStates.bind(this));
    }

    /**
     * Perform action for a node in the toolbar.
     * 
     * @param {string} name - The name of the node.
     * @param {Object} def - The definition of the node.
     * @param {Object} toolbarDef - The definition of the toolbar item.
     * @param {boolean} checkOnly - Whether to only check if the action can be performed.
     */
    nodeAction(name, def, toolbarDef, checkOnly = false) {
        if (name === 'head') {
            // Check if we're in a list item
            const { state } = this.editor;
            const { selection } = state;
            const { $from } = selection;
            const listItem = findParentNodeClosestToPos($from, node => node.type.name === 'item');
            
            if (listItem) {
                // If in a list item, use transformToHead
                if (checkOnly) {
                    return this.editor.can().transformToHead();
                }
                this.editor.chain().focus().transformToHead().run();
                return;
            }
        }

        let chain;
        if (checkOnly) {
            chain = this.editor.can();
        } else {
            chain = this.editor.chain().focus();
        }

        if (toolbarDef.command) {
            switch (toolbarDef.command) {
                case 'toggleSource':
                    return checkOnly ? true : this.toggleSource();
                case 'toggleDebug':
                    return checkOnly ? true : this.toggleDebug();
            }
            if (toolbarDef.args) {
                chain = chain[toolbarDef.command](...toolbarDef.args);
            } else {
                chain = chain[toolbarDef.command](name, toolbarDef.attributes);
            }
        } else if (def.type === 'inline') {
            chain = chain.toggleMark(name, toolbarDef.attributes);
        } else if (def.type === 'list') {
            chain = chain.toggleList(toolbarDef.attributes);
        } else if (def.type === 'anchor') {
            chain = chain.addAnchor(toolbarDef.attributes);
        } else if (def.type === 'empty' || def.type === 'graphic') {
            chain = chain.insertContent({
                type: name,
                attrs: toolbarDef.attributes
            });
        } else {
            // Check if the node's content model is a textBlock
            const nodeType = this.editor.schema.nodes[name];
            if (nodeType && nodeType.isTextblock) {
                chain = chain.setNode(name, toolbarDef.attributes);
            } else {
                chain = chain.wrapIn(name, toolbarDef.attributes);
            }
        }

        if (checkOnly) {
            return chain;
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
        button.dataset.name = name;
        
        // Add active state styling
        button.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent editor from losing focus
        });


        return button;
    }

    /**
     * Update the state of buttons based on the current selection.
     */
    updateButtonStates() {
        const buttons = this.toolbar.querySelectorAll('a[data-name]');
        buttons.forEach(button => {
            const nodeType = this.schemaDef.schema[button.dataset.name];
            
            if (!nodeType) return;
            
            // Use nodeAction with checkOnly=true to determine if the action can be performed
            const isValid = this.nodeAction(button.dataset.name, nodeType, nodeType, true);
            
            button.disabled = !isValid;
            if (!isValid) {
                button.classList.add('disabled');
            } else {
                button.classList.remove('disabled');
            }
            button.classList.toggle('active', this.editor.isActive(button.dataset.name));
        });
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
        link.dataset.name = name;
        link.appendChild(document.createTextNode(' ' + label));
        link.href = '#';
        li.appendChild(link);
        link.addEventListener('click', (ev) => {
            ev.preventDefault();
            select.open = false;
            this.nodeAction(name, def, toolbarDef);
        });

        select.querySelector('ul').appendChild(li);
    }

    toggleSource() {
        const component = this.toolbar.closest('jinn-tap');
        const editorArea = component.querySelector('.editor-area');
        const codeArea = component.querySelector('.code-area');
        if (codeArea.style.display === 'none') {
            codeArea.style.display = 'block';
            editorArea.style.display = 'none';
        } else {
            codeArea.style.display = 'none';
            editorArea.style.display = 'block';
        }
        return true;
    }

    toggleDebug() {
        const component = this.toolbar.closest('jinn-tap');
        if (component.hasAttribute('debug')) {
            component.removeAttribute('debug');
        } else {
            component.setAttribute('debug', '');
        }
        return true;
    }
}