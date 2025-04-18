import { marksInRange, occurrences } from './util.js';
import { kwicText } from './kwic.js';
import { Mark, Node } from '@tiptap/pm/model';

export class AttributePanel {

    constructor(editor, schemaDef) {
        this.editor = editor.tiptap;
        this.schemaDef = schemaDef;
        this.panel = editor.querySelector('.attribute-panel');
        this.currentElement = null;
        this.currentMark = null;
        this.setupEventListeners();

        this.overlay = document.createElement('div');
        this.overlay.className = 'jinn-tap overlay';
        this.overlay.style.display = 'block';
        this.overlay.style.position = 'fixed';
        this.overlay.style.pointerEvents = 'none';
        this.overlay.style.zIndex = '1000';
        this.overlay.style.display = 'none';
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
        const matchingMarks = marksInRange(editor, from, to);

        if (matchingMarks && matchingMarks.length > 0) {
            this.currentElement = null;
            const matchingMark = matchingMarks[matchingMarks.length - 1];
            if (this.currentMark?.mark != matchingMark.mark) {
                this.showMarkAttributes(matchingMark.mark, matchingMark.text);
            }
            this.currentMark = matchingMark;
            return;
        }

        // If no marks, check for nodes
        const $pos = editor.state.doc.resolve(from);
        const node = $pos.node();
        
        this.currentMark = null;
        if (node && Object.keys(this.schemaDef.schema).includes(node.type.name)) {
            if (this.currentElement == node) {
                return;
            }
            this.currentElement = node;
            this.currentAttributes = { ...node.attrs };
            this.showNodeAttributes(node);
        } else {
            this.currentElement = null;
            this.currentAttributes = {};
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

    createAttributeInput(form, attrName, attrDef, currentValue, placeholder = '') {
        const label = document.createElement('label');
        label.textContent = attrName;

        let input;
        if (attrDef.enum) {
            if (attrDef.open) {
                input = document.createElement('input');
                input.type = 'text';
                input.setAttribute('list', `${attrName}-list`);
                const datalist = document.createElement('datalist');
                datalist.id = `${attrName}-list`;
                attrDef.enum.forEach(value => {
                    const option = document.createElement('option');
                    option.value = value;
                    datalist.appendChild(option);
                });
                form.appendChild(datalist);
            } else {
                input = document.createElement('select');
                attrDef.enum.forEach(value => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = value;
                    input.appendChild(option);
                });
            }
        } else {
            input = document.createElement('input');
            input.type = 'text';
        }
        input.placeholder = placeholder;
        input.value = currentValue || attrDef.default || '';
        input.name = attrName;

        label.appendChild(input);
        form.appendChild(label);
        return input;
    }

    updatePanel(nodeOrMark, text) {
        if (!this.panel) return;
        
        this.panel.innerHTML = '';
        
        if (!nodeOrMark) {
            this.panel.innerHTML = '<p>Select text or a node to edit attributes</p>';
            return;
        }

        const def = this.schemaDef.schema[nodeOrMark.type.name];
        
        if (!def) {
            this.panel.innerHTML = '';
            return;
        }

        const title = document.createElement('h4');
        title.textContent = nodeOrMark.type.name;
        this.panel.appendChild(title);

        const info = document.createElement('div');
        this.panel.appendChild(info);

        const form = document.createElement('form');
        this.panel.appendChild(form);

        // Merge global attributes with node-specific attributes
        const attributes = { ...this.schemaDef.attributes, ...def.attributes };
        
        Object.entries(attributes).forEach(([attrName, attrDef]) => {
            if (attrName.startsWith('_')) {
                return;
            }
            if (attrDef.connector) {
                const input = this.createAttributeInput(
                    form,
                    attrName, 
                    attrDef, 
                    nodeOrMark.attrs[attrName],
                    "No reference assigned"
                );
                input.readOnly = true;

                const details = document.createElement('details');
                details.open = !nodeOrMark.attrs[attrName];
                const summary = document.createElement('summary');
                summary.textContent = 'Lookup';
                details.appendChild(summary);

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
                    details.open = false;
                    this.handleAttributeUpdate(nodeOrMark, { [attrName]: value });
                });
                details.appendChild(lookup);
                form.appendChild(details);

                if (nodeOrMark.attrs[attrName]) {
                    const ref = nodeOrMark.attrs[attrName].substring(nodeOrMark.attrs[attrName].indexOf('-') + 1);
                    lookup.lookup(attrDef.connector.type, ref, info)
                        .then(occurrences => {
                            const strings = occurrences.strings;
                            // Sort strings by length in descending order
                            strings.sort((a, b) => b.length - a.length);
                            strings.unshift(text);
                            this.updateOccurrences(this.editor, nodeOrMark, strings);
                        });
                }
            } else {
                this.createAttributeInput(
                    form,
                    attrName, 
                    attrDef, 
                    nodeOrMark.attrs[attrName]
                );
            }
        });

        // Add Apply button if there are attributes
        // Skip button if only one attribute and it has a connector
        if (Object.keys(attributes).length > 0 && 
            !(Object.keys(attributes).length === 1 && attributes[Object.keys(attributes)[0]].connector)) {
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
        const formData = new FormData(this.panel.querySelector('form'));
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
        if (nodeOrMark instanceof Mark) {
            this.editor.chain()
                .focus()
                .extendMarkRange(nodeOrMark.type)
                .run();
        }

        if (Object.keys(pendingChanges).length > 0) {
            if (nodeOrMark instanceof Mark) {
                if (clearedAttributes.length > 0) {
                    this.editor.commands.resetAttributes(nodeOrMark.type, clearedAttributes);
                }
                this.editor.chain()
                    .focus()
                    .updateAttributes(nodeOrMark.type, pendingChanges)
                    .setTextSelection({ from, to })
                    .run();
            } else {
                // Find the position of the node or mark in the document
                let pos = null;
                this.editor.state.doc.nodesBetween(0, this.editor.state.doc.content.size, (node, nodePos) => {
                    // For nodes, check if this is the node we're looking for
                    if (node.eq(nodeOrMark)) {
                        pos = nodePos;
                        return false; // Stop traversal
                    }
                });
                
                if (pos !== null) {
                    const tr = this.editor.state.tr;
                    tr.setNodeMarkup(pos, nodeOrMark.type, { ...nodeOrMark.attrs, ...pendingChanges });
                    this.editor.view.dispatch(tr);
                }
            }
        }
    }

    updateOccurrences(editor, markOrNode, strings) {
        const result = occurrences(editor, strings);

        const div = document.createElement('div');
        div.classList.add('occurrences');
        div.innerHTML = `
            <h5>Other Occurrences
                <div role="group">
                    <button class="apply-all" data-tooltip="Apply to All">
                        <i class="bi bi-check-all"></i>
                    </button>
                </div>
            </h5>
            <ul></ul>`;
        const ul = div.querySelector('ul');
        this.panel.appendChild(div);

        // Store all occurrence positions and their checkboxes
        const occurrenceData = [];
        for (const [string, positions] of Object.entries(result)) {
            for (const pos of positions) {
                const $pos = editor.state.doc.resolve(pos.pos);
                let node = $pos.node();
                let textNode = null;
                if (!node.isText) {
                    // If not a text node, try to find the text node at this position
                    editor.state.doc.nodesBetween(pos.pos, pos.pos + pos.length, (node, pos) => {
                        if (node.isText) {
                            textNode = node;
                            return false; // Stop traversal once we find a text node
                        }
                    });
                }
                const hasMark = textNode && textNode.marks.find(mark => markOrNode.eq(mark));
                const li = document.createElement('li');
                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = hasMark;
                label.appendChild(checkbox);

                // Store the occurrence data
                occurrenceData.push({
                    checkbox,
                    from: pos.pos + pos.index,
                    to: pos.pos + pos.index + pos.length,
                    hasMark
                });

                const text = editor.state.doc.textBetween(pos.pos, $pos.end());
                const kwic = kwicText(text, pos.index, pos.index + pos.length);
                const span = document.createElement('span');
                span.innerHTML = kwic;
                label.appendChild(span);
                li.appendChild(label);
                ul.appendChild(li);

                label.addEventListener('mouseenter', (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    const domNode = editor.view.nodeDOM(pos.pos);
                    if (domNode) {
                        // Ensure the highlighted element is visible in the viewport
                        const scrollTarget = domNode.nodeType === Node.TEXT_NODE ? domNode.parentNode : domNode;
                        scrollTarget.scrollIntoView({ behavior: 'instant', block: 'center' });

                        let rect;
                        if (domNode.nodeType === Node.TEXT_NODE) {
                            const range = document.createRange();
                            range.setStart(domNode, pos.index);
                            range.setEnd(domNode, pos.index + pos.length);
                            rect = range.getBoundingClientRect();
                        } else {
                            rect = domNode.getBoundingClientRect();
                        }
                       
                        this.overlay.style.display = 'block';
                        this.overlay.style.top = (rect.top - 10) + 'px';
                        this.overlay.style.left = (rect.left - 10) + 'px';
                        this.overlay.style.width = (rect.width + 20) + 'px'; 
                        this.overlay.style.height = (rect.height + 20) + 'px';
                        document.body.appendChild(this.overlay);
                    }
                });
                label.addEventListener('mouseleave', (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    this.overlay.style.display = 'none';
                });
                checkbox.addEventListener('change', (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    this.editor.chain()
                        .focus()
                        .setTextSelection({from: pos.pos + pos.index, to: pos.pos + pos.index + pos.length})
                        .toggleMark(markOrNode.type, markOrNode.attrs)
                        .run();
                });
            }
        }

        // Add click handler for apply-all button
        const applyAllButton = div.querySelector('.apply-all');
        applyAllButton.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();

            // Get all unmarked occurrences
            const unmarkedOccurrences = occurrenceData.filter(data => !data.checkbox.checked);
            
            if (unmarkedOccurrences.length > 0) {
                // Start a chain command
                let chain = this.editor.chain().focus();
                
                // Apply marks to all unmarked occurrences in one transaction
                unmarkedOccurrences.forEach(data => {
                    chain = chain
                        .setTextSelection({from: data.from, to: data.to})
                        .toggleMark(markOrNode.type, markOrNode.attrs);
                    
                    // Update checkbox state
                    data.checkbox.checked = true;
                });
                
                // Execute all commands
                chain.run();
            }
        });
    }
} 