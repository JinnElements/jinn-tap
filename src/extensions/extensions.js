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
    Object.entries(schemaDef.schema).forEach(([name, def]) => {
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
                            tagName: def.tagName, // Allow custom tag name override
                        };
                    },
                    renderHTML({ HTMLAttributes }) {
                        const prefix = this.options.prefix || 'tei-';
                        // Use custom tagName if provided, but add prefix for HTML custom elements
                        // (prefix is only omitted in XML output, not in editor HTML)
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
        // Merge global attributes with node-specific attributes
        const attributes = { ...schemaDef.attributes, ...def.attributes };
        const config = {
            prefix: prefix, // Pass the format prefix to extensions
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
