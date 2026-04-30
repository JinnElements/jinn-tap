import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import { JinnInline } from './inline.js';
import { JinnBlock } from './block.js';
import { JinnList, JinnItem } from './list.js';
import { JinnEmptyElement } from './empty.js';
import { JinnAnchor } from './anchor.js';
import { JinnGraphic } from './graphic.js';
import { JinnTable } from './tables/table.js';
import { JinnRow } from './tables/row.js';
import { JinnCell } from './tables/cell.js';
import { JinnReference } from './ref.js';

/**
 * Create nodes and marks from a schema definition.
 *
 * @param {Object} schemaDef - The schema definition
 * @param {string} prefix - Prefix for HTML custom elements (e.g., 'tei-', 'jats-')
 * @param {string} notesWrapper - Notes wrapper element name
 * @param {Object} footnoteOptions - Options for footnote handling (noteName, anchorName, linkDirection)
 * @returns {Array} - nodes and marks
 */
export function createFromSchema(schemaDef, prefix = 'tei-', notesWrapper = 'listAnnotation', footnoteOptions = {}) {
    const JinnDocument = createDocumentExtension(notesWrapper);
    const extensions = [JinnDocument, Text];
    Object.entries(schemaDef.schema).forEach(([baseName, rawDef]) => {
        // Support an array of conditional definitions for a single XML element name.
        // Each item may have a "when" object (attr→value map) to conditionally match.
        const defs = Array.isArray(rawDef) ? rawDef : [rawDef];
        const conditions = defs.map(d => d.when || null);

        defs.forEach((def, index) => {
            // First item keeps the base name so existing anchorName/noteName references work.
            // Subsequent items get baseName + index (e.g. "xref1").
            const name = index === 0 ? baseName : `${baseName}${index}`;

            // Build getAttrs for parseHTML when conditional dispatch is needed.
            let getAttrs = null;
            if (def.when) {
                const cond = def.when;
                getAttrs = (el) => {
                    const matches = Object.entries(cond).every(([attr, val]) => el.getAttribute(attr) === val);
                    return matches ? null : false;
                };
            } else if (conditions.some(c => c !== null)) {
                // Default (no "when"): exclude elements matched by sibling conditions.
                const siblings = conditions.filter(c => c !== null);
                getAttrs = (el) => {
                    const excluded = siblings.some(cond =>
                        Object.entries(cond).every(([attr, val]) => el.getAttribute(attr) === val)
                    );
                    return excluded ? false : null;
                };
            }

            let NodeOrMark;
            switch (def.type) {
                case 'inline':
                    NodeOrMark = JinnInline.extend({
                        name: name,
                    });
                    break;
                case 'anchor':
                    NodeOrMark = JinnAnchor.extend({
                        name: name,
                    });
                    break;
                case 'ref':
                    NodeOrMark = JinnReference.extend({
                        name: name,
                    });
                    break;
                case 'empty':
                    NodeOrMark = JinnEmptyElement.extend({
                        name: name,
                    });
                    break;
                case 'list':
                    NodeOrMark = JinnList.extend({
                        name: name,
                        content: def.content || 'item+',
                    });
                    break;
                case 'listItem':
                    NodeOrMark = JinnItem.extend({
                        name: name,
                        content: def.content || 'p block*',
                        addOptions() {
                            return {
                                ...this.parent?.(),
                                tagName: def.tagName,
                            };
                        },
                        renderHTML({ HTMLAttributes }) {
                            const prefix = this.options.prefix || 'tei-';
                            if (this.options.tagName) {
                                return [`${prefix}${this.options.tagName}`, HTMLAttributes, 0];
                            }
                            const tag = `${prefix}${this.name}`;
                            return [tag, HTMLAttributes, 0];
                        },
                        parseHTML() {
                            const prefix = this.options.prefix || 'tei-';
                            const customTag = this.options.tagName;
                            const defaultTag = `${prefix}${this.name}`;
                            const tags = [];
                            if (customTag) {
                                tags.push({ tag: customTag });
                            }
                            tags.push({ tag: defaultTag });
                            return tags;
                        },
                    });
                    break;
                case 'block':
                    NodeOrMark = JinnBlock.extend({
                        name: name,
                        group: def.group || 'block',
                        defining: def.defining,
                        isolating: def.isolating,
                        priority: def.priority,
                        inline: def.inline,
                        content: def.content,
                        selectable: def.selectable,
                    });
                    break;
                case 'graphic':
                    NodeOrMark = JinnGraphic.extend({
                        name: name,
                    });
                    break;
                case 'table':
                    NodeOrMark = JinnTable.extend({});
                    break;
                case 'row':
                    NodeOrMark = JinnRow.extend({});
                    break;
                case 'cell':
                    NodeOrMark = JinnCell.extend({});
                    break;
            }

            // When getAttrs is needed or the node name differs from the XML element name,
            // override parseHTML/renderHTML so both use the base element name (baseName).
            if (getAttrs || name !== baseName) {
                const capturedBaseName = baseName;
                const capturedGetAttrs = getAttrs;
                NodeOrMark = NodeOrMark.extend({
                    parseHTML() {
                        const p = this.options.prefix || 'tei-';
                        const rule = { tag: `${p}${capturedBaseName}` };
                        if (capturedGetAttrs) rule.getAttrs = capturedGetAttrs;
                        return [rule];
                    },
                    renderHTML({ HTMLAttributes }) {
                        const p = this.options.prefix || 'tei-';
                        return [`${p}${capturedBaseName}`, HTMLAttributes, 0];
                    },
                });
            }

            // Merge global attributes with node-specific attributes
            const attributes = { ...schemaDef.attributes, ...def.attributes };
            const config = {
                prefix: prefix,
                shortcuts: def.keyboard,
                attributes: attributes,
                label: def.label,
            };
            if (def.inputRules) {
                config.inputRules = def.inputRules;
            }
            // Pass footnote options to anchor extension
            if (def.type === 'anchor' && footnoteOptions) {
                if (footnoteOptions.noteName) {
                    config.noteName = footnoteOptions.noteName;
                }
                if (footnoteOptions.anchorName) {
                    config.anchorName = footnoteOptions.anchorName;
                }
                if (footnoteOptions.linkDirection) {
                    config.linkDirection = footnoteOptions.linkDirection;
                }
            }
            extensions.push(NodeOrMark.configure(config));
        });
    });
    return extensions;
}

/**
 * Create a custom document extension with dynamic content based on notesWrapper
 * @param {string} notesWrapper - The notes wrapper node name (e.g., 'listAnnotation', 'fn-group')
 * @returns {Extension} Document extension
 */
export function createDocumentExtension(notesWrapper = 'listAnnotation') {
    return Document.extend({
        content: `heading* block+ ${notesWrapper}?`,
    });
}
