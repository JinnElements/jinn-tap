import { marksInRange, occurrences } from './util/util.js';
import { kwicText } from './util/kwic.js';
import { Mark } from '@tiptap/pm/model';

/**
 * @typedef ConnectorDefinition
 *
 * @property {string} name - The connector to use. Airtable or GND or other
 */

/**
 * @typedef AttributeDefinition
 *
 * @property {string} type - The type of the attribute
 * @property {ConnectorDefinition} connector - Any connector to use to set the value
 */

/**
 * @typedef ConditionalAttributeDefinition
 *
 * @extends AttributeDefinition
 *
 * @property {string} when - An optional XPath that determines when a definition should apply
 */

/**
 * Panel for editing the attributes of the current node or mark.
 *
 * @param {Editor} editor - The editor instance.
 * @param {Object} schemaDef - The schema definition.
 */
export class AttributePanel {
    static CONTENT_MAX_WIDTH_VAR = '--jinn-tap-content-max-width';
    static CONNECTOR_PANEL_WIDTH_VAR = '--jinn-tap-connector-panel-width';
    static DEFAULT_CONNECTOR_PANEL_WIDTH = '20rem';

    constructor(editor, schemaDef) {
        this.host = editor;
        this.editor = editor.tiptap;
        this.schemaDef = schemaDef;
        this.externalSidebar = editor.externalSidebar;
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

    static lengthPx(host, varName, fallback = null) {
        if (!host || typeof getComputedStyle === 'undefined') {
            return fallback != null ? AttributePanel._probeLengthPx(host, fallback) : null;
        }
        const raw = getComputedStyle(host).getPropertyValue(varName).trim();
        if (!raw || raw === 'none' || raw === 'initial' || raw === 'unset') {
            return fallback != null ? AttributePanel._probeLengthPx(host, fallback) : null;
        }
        if (!/^[\d.]+\s*(px|rem|em|vw|vh|%|ch|ex)$/.test(raw)) {
            return fallback != null ? AttributePanel._probeLengthPx(host, fallback) : null;
        }
        return AttributePanel._probeLengthPx(host, raw);
    }

    static _probeLengthPx(host, length) {
        const probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;visibility:hidden;height:0;width:0';
        probe.style.width = length;
        (host || document.documentElement).appendChild(probe);
        const px = probe.getBoundingClientRect().width;
        probe.remove();
        return px;
    }

    _hasRoomForDockedPanel() {
        if (!this.host) return false;
        const hostWidth = this.host.getBoundingClientRect().width;
        const contentMax = AttributePanel.lengthPx(this.host, AttributePanel.CONTENT_MAX_WIDTH_VAR);
        if (contentMax == null) {
            return false;
        }
        const panelWidth = AttributePanel.lengthPx(
            this.host,
            AttributePanel.CONNECTOR_PANEL_WIDTH_VAR,
            AttributePanel.DEFAULT_CONNECTOR_PANEL_WIDTH,
        );
        return hostWidth >= contentMax + panelWidth;
    }

    _isWideLayout() {
        return this.host?.classList.contains('is-wide-layout') ?? false;
    }

    _syncWideLayoutClass() {
        if (this.externalSidebar || !this.host) return;
        const wide = this._hasRoomForDockedPanel();
        const wasWide = this.host.classList.contains('is-wide-layout');
        this.host.classList.toggle('is-wide-layout', wide);
        if (!this.panel?.classList.contains('has-connector')) return;
        if (wide && !wasWide) {
            this.expandSheet();
        } else if (!wide && wasWide && this.panel.classList.contains('is-expanded')) {
            this.panel.classList.remove('is-expanded');
            this._syncSheetToggle();
        }
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
            const pos = detail.pos;
            // Always read the live node from the document — node views may close over
            // a stale Node object from when the view was first created.
            const node = this.editor.state.doc.nodeAt(pos);
            if (!node) {
                return;
            }
            this.editor.chain().focus().setNodeSelection(pos).run();
            this.updatePanel(node, pos);
        });

        if (!this.externalSidebar && typeof window !== 'undefined' && typeof ResizeObserver !== 'undefined') {
            this._wideLayoutObserver = new ResizeObserver(() => this._syncWideLayoutClass());
            this._wideLayoutObserver.observe(this.host);
            this._syncWideLayoutClass();
        }
    }

    updatePanelForCurrentPosition(editor) {
        const { from, to, node: selectedNode } = editor.state.selection;

        // Whole-node selection (NodeSelection - e.g. from a breadcrumb click or an
        // empty-element click): `from` sits at the node's own boundary, so
        // resolving it below with $pos.node() would give its *parent*, not the
        // selected node. Use the selection's node directly instead.
        if (selectedNode) {
            this.currentMark = null;
            if (Object.keys(this.schemaDef.schema).includes(selectedNode.type.name)) {
                if (this.currentElement === selectedNode) {
                    return;
                }
                this.currentElement = selectedNode;
                this.currentAttributes = { ...selectedNode.attrs };
                this.updatePanel(selectedNode, from);
            } else {
                this.currentElement = null;
                this.currentAttributes = {};
                this.hidePanel();
            }
            return;
        }

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

    expandSheet() {
        if (!this.panel?.classList.contains('has-connector')) return;
        this.panel.classList.add('is-expanded');
        this._syncSheetToggle();
        this._syncWideLayoutClass();
    }

    collapseSheet() {
        // Wide layout keeps the connector panel open as a fixed right column.
        if (this._isWideLayout()) return;
        this.panel?.classList.remove('is-expanded');
        this._syncSheetToggle();
    }

    _syncSheetToggle() {
        const toggle = this.panel?.querySelector('.attribute-panel__toggle');
        if (!toggle) return;
        const expanded = this.panel.classList.contains('is-expanded');
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        const count = Number(this.panel.dataset.occurrenceCount || 0);
        const suffix = !expanded && count > 0 ? ` · ${count} more` : '';
        toggle.textContent = (expanded ? 'Collapse' : 'Expand') + suffix;
    }

    _connectorSummary(elementName, attributes, nodeOrMark) {
        const refs = Object.entries(attributes)
            .filter(([, def]) => def.connector)
            .map(([name]) => nodeOrMark.attrs[name])
            .filter(Boolean);
        if (refs.length > 0) {
            return `${elementName} · ${refs.join(', ')}`;
        }
        return `${elementName} · No reference`;
    }

    _setSummaryText(nodeOrMark, displayValue) {
        const summary = this.panel.querySelector('.attribute-panel__summary');
        if (summary) {
            summary.textContent = `${nodeOrMark.type.name} · ${displayValue}`;
        }
    }

    _addSheetChrome(elementName, attributes, nodeOrMark) {
        // The chrome provides the collapse/expand affordance for the bottom-dock /
        // slide-over UX. When the panel lives in an external, always-visible sidebar
        // there is nothing to collapse, so skip it.
        if (this.externalSidebar) return;
        this.panel.classList.add('has-connector');

        const chrome = document.createElement('header');
        chrome.className = 'attribute-panel__chrome';

        const summary = document.createElement('p');
        summary.className = 'attribute-panel__summary';
        summary.textContent = this._connectorSummary(elementName, attributes, nodeOrMark);

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'attribute-panel__toggle';
        toggle.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            this.panel.classList.toggle('is-expanded');
            this._syncSheetToggle();
            this._syncWideLayoutClass();
        });

        chrome.append(summary, toggle);
        this.panel.prepend(chrome);
        if (this._hasRoomForDockedPanel()) {
            this.expandSheet();
        } else {
            this._syncWideLayoutClass();
            this._syncSheetToggle();
        }
    }

    createAttributeConnector(fieldset, attrName, attrDef, currentValue, info, nodeOrMark, pos, text) {
        if (attrDef.connector?.name === 'Asset') {
            this.createAssetConnector(fieldset, attrName, attrDef, currentValue, nodeOrMark, pos);
            return;
        }

        const field = document.createElement('span');
        field.className = 'attribute-panel__field';

        const label = document.createElement('label');
        label.textContent = attrName;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.readOnly = true;
        input.name = attrName;
        input.placeholder = 'No reference assigned';
        field.appendChild(label);
        field.appendChild(input);
        fieldset.appendChild(field);

        const details = document.createElement('details');
        details.open = !currentValue;
        const summary = document.createElement('summary');
        summary.textContent = 'Lookup';
        details.appendChild(summary);

        const lookup = document.createElement('pb-authority-lookup');
        const needsLookup = !currentValue;
        lookup.setAttribute('type', attrDef.connector.type);
        lookup.setAttribute('query', text);
        lookup.setAttribute('auto', needsLookup);
        lookup.setAttribute('no-occurrences', true);
        const authority = document.createElement('pb-authority');
        // Common options
        authority.setAttribute('base', attrDef.connector.base);
        authority.setAttribute('connector', attrDef.connector.name);
        authority.setAttribute('name', attrDef.connector.type);

        switch (attrDef.connector.name) {
            case 'GND':
                // No additional config needed
                break;
            case 'GeoNames':
                authority.setAttribute('user', attrDef.connector.user);
                break;
            case 'Airtable':
                authority.setAttribute('api-key', attrDef.connector.apiKey);
                authority.setAttribute('table', attrDef.connector.table);
                authority.setAttribute('tokenize', attrDef.connector.tokenize.join(', '));
                authority.setAttribute('filter', attrDef.connector.filter);
                authority.setAttribute('fields', attrDef.connector.fields.join(', '));
                authority.setAttribute('label', attrDef.connector.label);

                const infoTpl = document.createElement('template');
                infoTpl.classList.add('info');
                infoTpl.content.appendChild(document.createTextNode(attrDef.connector.label));
                authority.appendChild(infoTpl);
                break;
            case 'KBGA':
                authority.setAttribute('api', attrDef.connector.api);
                authority.setAttribute('limit', attrDef.connector.limit);
                break;
            case 'Anton':
            case 'GF':
                authority.setAttribute('api', attrDef.connector.api);
                authority.setAttribute('url', attrDef.connector.url);
                authority.setAttribute('limit', attrDef.connector.limit);
                authority.setAttribute('provider', attrDef.connector.provider);
                break;
            case 'ReconciliationService':
                authority.setAttribute('endpoint', attrDef.connector.endpoint);
                authority.setAttribute('debug', attrDef.connector.debug);
                break;
            case 'Custom':
                // @TODO: support this if we ever need to
                throw new Error('Not implemented: custom authority connector');
            default:
        }
        if (attrDef.connector.user) {
            authority.setAttribute('user', attrDef.connector.user);
        }
        lookup.appendChild(authority);

        document.addEventListener('pb-authority-select', (event) => {
            const value = attrDef.connector.prefix
                ? `${attrDef.connector.prefix}-${event.detail.properties.ref}`
                : event.detail.properties.ref;
            input.value = value;
            details.open = false;
            this._setSummaryText(nodeOrMark, event.detail.strings?.[0] || value);
            this.handleAttributeUpdate(nodeOrMark, pos, { [attrName]: value });
            this.collapseSheet();
        });
        details.addEventListener('toggle', () => {
            if (details.open) this.expandSheet();
        });
        details.appendChild(lookup);
        fieldset.parentNode.appendChild(details);

        if (currentValue) {
            const ref = currentValue.substring(currentValue.indexOf('-') + 1);
            lookup.lookup(attrDef.connector.type, ref, info).then((occurrences) => {
                const strings = occurrences.strings;
                if (strings.length > 0) {
                    this._setSummaryText(nodeOrMark, strings[0]);
                }
                // Sort strings by length in descending order
                strings.sort((a, b) => b.length - a.length);
                strings.unshift(text);
                this.updateOccurrences(this.editor, nodeOrMark, strings);
            });
        }
    }

    /**
     * Asset picker for graphic `url` / `xlink:href` when `connector.name === 'Asset'`.
     */
    createAssetConnector(fieldset, attrName, attrDef, currentValue, nodeOrMark, pos) {
        const assets = this.host.assets;
        const field = document.createElement('span');
        field.className = 'attribute-panel__field';

        const label = document.createElement('label');
        label.textContent = attrName;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue || '';
        input.name = attrName;
        input.placeholder = 'myimage.png';
        field.appendChild(label);
        field.appendChild(input);
        fieldset.appendChild(field);

        if (!assets) {
            // Should not be reached — callers fall back to createAttributeInput
            input.readOnly = false;
            return;
        }

        input.readOnly = true;

        const details = document.createElement('details');
        details.open = true;
        const summary = document.createElement('summary');
        summary.textContent = 'Images';
        details.appendChild(summary);

        const picker = document.createElement('div');
        picker.className = 'asset-picker';

        const dropzone = document.createElement('div');
        dropzone.className = 'asset-picker__dropzone';
        dropzone.innerHTML =
            '<span>Drop an image here, or <label class="asset-picker__browse">browse<input type="file" accept="image/*" hidden></label></span>';
        const fileInput = dropzone.querySelector('input[type="file"]');

        const grid = document.createElement('div');
        grid.className = 'asset-picker__grid';

        const status = document.createElement('p');
        status.className = 'asset-picker__status';

        picker.append(dropzone, status, grid);
        details.appendChild(picker);
        fieldset.parentNode.appendChild(details);

        details.addEventListener('toggle', () => {
            if (details.open) this.expandSheet();
        });
        this.expandSheet();

        const selectPath = (path) => {
            input.value = path;
            this._setSummaryText(nodeOrMark, path);
            this.handleAttributeUpdate(nodeOrMark, pos, { [attrName]: path });
            this.collapseSheet();
            details.open = false;
            refreshGrid();
        };

        const refreshGrid = async () => {
            grid.replaceChildren();
            status.textContent = 'Loading…';
            try {
                const list = await assets.list();
                const images = list.filter((a) => (a.mimeType || '').startsWith('image/'));
                if (images.length === 0) {
                    status.textContent = 'No images yet — upload one above.';
                    return;
                }
                status.textContent = '';
                for (const meta of images) {
                    const wrap = document.createElement('div');
                    wrap.className = 'asset-picker__item';

                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'asset-picker__thumb';
                    if (meta.path === input.value) {
                        button.classList.add('is-selected');
                    }
                    button.title = meta.path;
                    const img = document.createElement('img');
                    img.alt = meta.path;
                    img.loading = 'lazy';
                    const src = await assets.resolve(meta.path);
                    img.src = src;
                    const caption = document.createElement('span');
                    caption.textContent = meta.path;
                    button.append(img, caption);
                    button.addEventListener('click', () => selectPath(meta.path));

                    const deleteBtn = document.createElement('button');
                    deleteBtn.type = 'button';
                    deleteBtn.className = 'asset-picker__delete';
                    deleteBtn.title = `Delete ${meta.path}`;
                    deleteBtn.setAttribute('aria-label', `Delete ${meta.path}`);
                    deleteBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                        </svg>`;
                    deleteBtn.addEventListener('click', async (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const ok = await new Promise((resolve) => {
                            document.dispatchEvent(
                                new CustomEvent('jinn-toast', {
                                    detail: {
                                        message: `Delete “${meta.path}” from local storage?`,
                                        type: 'warn',
                                        sticky: true,
                                        confirm: {
                                            confirmLabel: 'Delete',
                                            cancelLabel: 'Cancel',
                                            onConfirm: () => resolve(true),
                                            onCancel: () => resolve(false),
                                        },
                                    },
                                }),
                            );
                        });
                        if (!ok) {
                            return;
                        }
                        try {
                            await assets.delete(meta.path);
                            if (input.value === meta.path) {
                                input.value = '';
                                this._setSummaryText(nodeOrMark, nodeOrMark.type.name);
                                this.handleAttributeUpdate(nodeOrMark, pos);
                            }
                            await refreshGrid();
                            document.dispatchEvent(
                                new CustomEvent('jinn-toast', {
                                    detail: { message: `Deleted ${meta.path}`, type: 'info' },
                                }),
                            );
                        } catch (err) {
                            console.error(err);
                            document.dispatchEvent(
                                new CustomEvent('jinn-toast', {
                                    detail: {
                                        message: err.message || 'Failed to delete asset',
                                        type: 'error',
                                    },
                                }),
                            );
                        }
                    });

                    wrap.append(button, deleteBtn);
                    grid.appendChild(wrap);
                }
            } catch (err) {
                console.error(err);
                status.textContent = 'Failed to load assets.';
            }
        };

        const uploadFiles = async (files) => {
            const file = files?.[0];
            if (!file) return;
            try {
                status.textContent = 'Uploading…';
                const path = (file.name || 'image').replace(/\\/g, '/').split('/').pop().trim() || 'image';
                await assets.put({ path, blob: file, mimeType: file.type || 'image/png' });
                selectPath(path);
                document.dispatchEvent(
                    new CustomEvent('jinn-toast', {
                        detail: { message: `Uploaded ${path}`, type: 'info' },
                    }),
                );
            } catch (err) {
                console.error(err);
                status.textContent = err.message || 'Upload failed.';
                document.dispatchEvent(
                    new CustomEvent('jinn-toast', {
                        detail: { message: err.message || 'Upload failed', type: 'error' },
                    }),
                );
            }
        };

        fileInput.addEventListener('change', () => {
            uploadFiles(fileInput.files);
            fileInput.value = '';
        });

        dropzone.addEventListener('dragover', (event) => {
            event.preventDefault();
            dropzone.classList.add('is-dragover');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
        dropzone.addEventListener('drop', (event) => {
            event.preventDefault();
            dropzone.classList.remove('is-dragover');
            uploadFiles(event.dataTransfer?.files);
        });

        refreshGrid();
    }

    createAttributeInput(form, attrName, attrDef, currentValue, placeholder = '') {
        const field = document.createElement('span');
        field.className = 'attribute-panel__field';

        const label = document.createElement('label');
        label.textContent = attrName;
        field.appendChild(label);

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
                field.appendChild(datalist);
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

        field.appendChild(input);
        form.appendChild(field);
        return input;
    }

    /**
     * @param {string} test
     * @param {import('@tiptap/pm/model').Node|Mark} nodeOrMark
     *
     */
    _evaluateXPathTest(test, nodeOrMark) {
        // For now, assume tests are always of the form @attr='value'.
        // TODO: Use a FontoXPath dom facade to execute XPaths over the tree and just evaluate XPath!
        const xpathParts = /@(?<namePart>(?:[a-zA-Z0-9]|-|_)*)\s*=\s*['"](?<valuePart>[^"']*)["']/.exec(test);
        if (!xpathParts) {
            console.error(`Unsupported attribute test ${test}. Only XPaths of the form @name='value' are supported`);
            return false;
        }

        const { namePart, valuePart } = xpathParts.groups;
        return nodeOrMark.attrs[namePart] === valuePart;
    }

    /**
     * @param {import('@tiptap/pm/model').Node|Mark} nodeOrMark
     * @param {Record<string, AttributeDefinition|AttributeDefinition[]>} schemaDefAttributes
     *
     * @returns {Record<string, AttributeDefinition>}
     */
    _findAttributeDefinitions(nodeOrMark, schemaDefAttributes) {
        /**
         * @type {Record<string, AttributeDefinition>}
         */
        const applicableDefinitions = {};

        for (const [attrName, def] of Object.entries(schemaDefAttributes)) {
            if (!Array.isArray(def)) {
                applicableDefinitions[attrName] = def;
                continue;
            }

            for (const conditionalDefinition of def) {
                if (!this._evaluateXPathTest(conditionalDefinition.when, nodeOrMark)) {
                    continue;
                }
                applicableDefinitions[attrName] = conditionalDefinition;
                break;
            }
        }

        return applicableDefinitions;
    }

    updatePanel(nodeOrMark, pos, text) {
        if (!this.panel) return;

        this.panel.innerHTML = '';
        this.panel.classList.remove('has-connector', 'is-expanded');
        delete this.panel.dataset.occurrenceCount;

        if (!nodeOrMark) {
            return;
        }

        let def = this.schemaDef.schema[nodeOrMark.type.name];
        if (Array.isArray(def)) {
            def = def[0];
        } else if (!def) {
            const m = nodeOrMark.type.name.match(/^(.+?)(\d+)$/);
            if (m) {
                const base = this.schemaDef.schema[m[1]];
                if (Array.isArray(base)) def = base[parseInt(m[2])];
            }
        }

        if (!def) {
            this.panel.innerHTML = '';
            return;
        }

        const title = document.createElement('h4');
        title.textContent = nodeOrMark.type.name;
        this.panel.appendChild(title);

        const info = document.createElement('div');
        info.className = 'attribute-panel__info';
        this.panel.appendChild(info);

        const form = document.createElement('form');
        this.panel.appendChild(form);

        const fieldset = document.createElement('fieldset');
        form.appendChild(fieldset);

        const globalAttributes = this.schemaDef.attributes;
        const schemaDefAttributes = this._findAttributeDefinitions(nodeOrMark, def.attributes ?? {});

        // Merge global attributes with node-specific attributes
        const attributes = { ...globalAttributes, ...schemaDefAttributes };

        const connectorEntries = Object.entries(attributes).filter(([name, attrDef]) => {
            if (name.startsWith('_') || !attrDef.connector) {
                return false;
            }
            // Asset connector only activates the sheet when a store is attached
            if (attrDef.connector.name === 'Asset' && !this.host.assets) {
                return false;
            }
            return true;
        });
        const hasConnector = connectorEntries.length > 0;

        if (hasConnector) {
            this._addSheetChrome(nodeOrMark.type.name, attributes, nodeOrMark);
        }

        Object.entries(attributes).forEach(([attrName, attrDef]) => {
            if (attrName.startsWith('_')) {
                return;
            }
            const useAssetConnector = attrDef.connector?.name === 'Asset' && this.host.assets;
            const useAuthorityConnector = attrDef.connector && attrDef.connector.name !== 'Asset';
            if (useAssetConnector || useAuthorityConnector) {
                this.createAttributeConnector(
                    fieldset,
                    attrName,
                    attrDef,
                    nodeOrMark.attrs[attrName],
                    info,
                    nodeOrMark,
                    pos,
                    text,
                );
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
            applyButton.className = 'attribute-panel__apply';
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
                    // Prefer the live node at pos — panel may still hold a stale Node
                    // reference from before a previous attribute update.
                    const liveNode = this.editor.state.doc.nodeAt(pos) || nodeOrMark;
                    const newAttrs = { ...liveNode.attrs, ...pendingChanges };
                    clearedAttributes.forEach((attr) => delete newAttrs[attr]);
                    console.log('<jinn-tap> newAttrs: %o', newAttrs);
                    tr.setNodeMarkup(pos, liveNode.type, newAttrs);
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

        const totalOccurrences = Object.values(result).reduce((sum, positions) => sum + positions.length, 0);
        this.panel.dataset.occurrenceCount = String(totalOccurrences);
        this._syncSheetToggle();

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
