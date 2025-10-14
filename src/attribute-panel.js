import { marksInRange, occurrences } from './util/util.js';
import { kwicText } from './util/kwic.js';
import { Mark } from '@tiptap/pm/model';

/**
 * Panel for editing the attributes of the current node or mark.
 *
 * @param {Editor} editor - The editor instance.
 * @param {Object} schemaDef - The schema definition.
 */
export class AttributePanel {
    constructor(editor, schemaDef) {
        this.editor = editor.tiptap;
        this.schemaDef = schemaDef;
        this.panel = editor.sidebarContainer.querySelector('.attribute-panel');
        this.currentElement = null;
        this.currentMark = null;
        this.setupEventListeners(editor);

        this.overlay = document.createElement('div');
        this.overlay.className = 'jinn-tap overlay';
        this.overlay.style.display = 'block';
        this.overlay.style.position = 'fixed';
        this.overlay.style.pointerEvents = 'none';
        this.overlay.style.zIndex = '1000';
        this.overlay.style.display = 'none';
    }

    setupEventListeners(component) {
        // Listen for selection changes
        this.editor.on('selectionUpdate', (ev) => {
            this.updatePanelForCurrentPosition(ev.editor);
        });

        // Listen for content changes
        this.editor.on('transaction', ({ editor, transaction }) => {
            // Skip remote transactions (from Yjs) to avoid unnecessary panel updates
            // when other users move their cursors or make changes
            const isRemoteTransaction = transaction.meta['y-sync$'] !== undefined;
            if (transaction.docChanged && !isRemoteTransaction) {
                this.updatePanelForCurrentPosition(editor);
            }
        });

        this.editor.options.element.addEventListener('empty-element-clicked', ({ detail }) => {
            const { node, pos } = detail;
            this.editor.chain().focus().setNodeSelection(pos).run();
            this.updatePanel(node, pos);
        });
    }

    updatePanelForCurrentPosition(editor) {
        const { from, to } = editor.state.selection;
        const matchingMarks = marksInRange(editor, from, to);

        if (matchingMarks && matchingMarks.length > 0) {
            this.currentElement = null;
            const matchingMark = matchingMarks[matchingMarks.length - 1];
            if (this.currentMark?.mark != matchingMark.mark) {
                this.updatePanel(matchingMark.mark, from, matchingMark.text);
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
            // Get the actual node position by finding its start position
            const nodePos = $pos.before();
            this.updatePanel(node, nodePos);
        } else {
            this.currentElement = null;
            this.currentAttributes = {};
            this.hidePanel();
        }
    }

    hidePanel() {
        this.updatePanel();
    }

    createAttributeInput(form, attrName, attrDef, currentValue, placeholder = '') {
        const label = document.createElement('label');
        label.textContent = attrName;
        label.setAttribute('for', attrName);

        let input;
        if (attrDef.enum) {
            if (attrDef.open) {
                input = document.createElement('input');
                input.type = 'text';
                input.setAttribute('list', `${attrName}-list`);
                const datalist = document.createElement('datalist');
                datalist.id = `${attrName}-list`;
                attrDef.enum.forEach((value) => {
                    const option = document.createElement('option');
                    option.value = value;
                    datalist.appendChild(option);
                });
                form.appendChild(datalist);
            } else {
                input = document.createElement('select');
                attrDef.enum.forEach((value) => {
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
        form.appendChild(label);
        input.setAttribute('id', attrName);

        form.appendChild(input);
        return input;
    }

    updatePanel(nodeOrMark, pos, text) {
        if (!this.panel) return;

        this.panel.innerHTML = '';

        if (!nodeOrMark) {
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

        const fieldset = document.createElement('fieldset');
        form.appendChild(fieldset);

        // Merge global attributes with node-specific attributes
        const attributes = { ...this.schemaDef.attributes, ...def.attributes };

        Object.entries(attributes).forEach(([attrName, attrDef]) => {
            if (attrName.startsWith('_')) {
                return;
            }
            if (attrDef.connector) {
                const label = document.createElement('label');
                label.textContent = attrName;
                const input = document.createElement('input');
                input.type = 'text';
                input.value = nodeOrMark.attrs[attrName];
                input.readOnly = true;
                input.name = attrName;
                input.placeholder = 'No reference assigned';
                input.appendChild(label);
                fieldset.appendChild(input);

                const details = document.createElement('details');
                details.open = !nodeOrMark.attrs[attrName];
                const summary = document.createElement('summary');
                summary.textContent = 'Lookup';
                details.appendChild(summary);

                const lookup = document.createElement('pb-authority-lookup');
                const needsLookup = nodeOrMark.attrs[attrName] || nodeOrMark.attrs[attrName] === '';
                lookup.setAttribute('type', attrDef.connector.type);
                lookup.setAttribute('query', text);
                lookup.setAttribute('auto', needsLookup);
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
                    this.handleAttributeUpdate(nodeOrMark, pos, { [attrName]: value });
                });
                details.appendChild(lookup);
                form.appendChild(details);

                if (nodeOrMark.attrs[attrName]) {
                    const ref = nodeOrMark.attrs[attrName].substring(nodeOrMark.attrs[attrName].indexOf('-') + 1);
                    lookup.lookup(attrDef.connector.type, ref, info).then((occurrences) => {
                        const strings = occurrences.strings;
                        // Sort strings by length in descending order
                        strings.sort((a, b) => b.length - a.length);
                        strings.unshift(text);
                        this.updateOccurrences(this.editor, nodeOrMark, strings);
                    });
                }
            } else {
                this.createAttributeInput(fieldset, attrName, attrDef, nodeOrMark.attrs[attrName]);
            }
        });

        // Add Apply button if there are attributes
        // Skip button if only one attribute and it has a connector
        if (
            Object.keys(attributes).length > 0 &&
            !(Object.keys(attributes).length === 1 && attributes[Object.keys(attributes)[0]].connector)
        ) {
            const footer = document.createElement('footer');
            const applyButton = document.createElement('button');
            applyButton.dataset.tooltip = 'Apply Changes';
            applyButton.type = 'submit';
            applyButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-check2-circle" viewBox="0 0 16 16">
                    <path d="M2.5 8a5.5 5.5 0 0 1 8.25-4.764.5.5 0 0 0 .5-.866A6.5 6.5 0 1 0 14.5 8a.5.5 0 0 0-1 0 5.5 5.5 0 1 1-11 0"/>
                    <path d="M15.354 3.354a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0z"/>
                </svg>
                <span>Apply</span>`;
            applyButton.addEventListener('click', (ev) => {
                ev.preventDefault();
                this.handleAttributeUpdate(nodeOrMark, pos);
            });
            footer.appendChild(applyButton);
            this.panel.appendChild(footer);
        }
    }

    handleAttributeUpdate(nodeOrMark, pos, pendingChanges = {}) {
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
            this.editor.chain().focus().extendMarkRange(nodeOrMark.type).run();
        }

        if (Object.keys(pendingChanges).length > 0 || clearedAttributes.length > 0) {
            if (nodeOrMark instanceof Mark) {
                if (clearedAttributes.length > 0) {
                    this.editor.commands.resetAttributes(nodeOrMark.type, clearedAttributes);
                }
                this.editor
                    .chain()
                    .focus()
                    .updateAttributes(nodeOrMark.type, pendingChanges)
                    .setTextSelection({ from, to })
                    .run();
            } else {
                // Find the position of the node or mark in the document
                if (pos !== null) {
                    const tr = this.editor.state.tr;
                    // Create new attributes object without cleared attributes
                    const newAttrs = { ...nodeOrMark.attrs, ...pendingChanges };
                    clearedAttributes.forEach((attr) => delete newAttrs[attr]);
                    console.log('<jinn-tap> newAttrs: %o', newAttrs);
                    tr.setNodeMarkup(pos, nodeOrMark.type, newAttrs);
                    this.editor.view.dispatch(tr);
                } else {
                    console.log('<jinn-tap> updating attributes: %o', pendingChanges);
                    this.editor
                        .chain()
                        .focus()
                        .resetAttributes(nodeOrMark.type, clearedAttributes)
                        .updateAttributes(nodeOrMark.type, pendingChanges)
                        .setTextSelection({ from, to })
                        .run();
                }

                if (nodeOrMark.type.name === 'note') {
                    this.editor.commands.updateNotes();
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
                const hasMark = textNode && textNode.marks.find((mark) => markOrNode.eq(mark));
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
                    hasMark,
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
                        const scrollTarget = domNode.nodeType === window.Node.TEXT_NODE ? domNode.parentNode : domNode;
                        scrollTarget.scrollIntoView({ behavior: 'instant', block: 'center' });

                        let rect;
                        if (domNode.nodeType === window.Node.TEXT_NODE) {
                            const range = document.createRange();
                            range.setStart(domNode, pos.index);
                            range.setEnd(domNode, pos.index + pos.length);
                            rect = range.getBoundingClientRect();
                        } else {
                            rect = domNode.getBoundingClientRect();
                        }

                        this.overlay.style.display = 'block';
                        this.overlay.style.top = rect.top - 4 + 'px';
                        this.overlay.style.left = rect.left - 4 + 'px';
                        this.overlay.style.width = rect.width + 4 + 'px';
                        this.overlay.style.height = rect.height + 4 + 'px';
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
                    this.editor
                        .chain()
                        .focus()
                        .setTextSelection({ from: pos.pos + pos.index, to: pos.pos + pos.index + pos.length })
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
            const unmarkedOccurrences = occurrenceData.filter((data) => !data.checkbox.checked);

            if (unmarkedOccurrences.length > 0) {
                // Start a chain command
                let chain = this.editor.chain().focus();

                // Apply marks to all unmarked occurrences in one transaction
                unmarkedOccurrences.forEach((data) => {
                    chain = chain
                        .setTextSelection({ from: data.from, to: data.to })
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
