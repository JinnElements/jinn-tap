import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import { TeiInline } from './inline.js';
import { TeiBlock } from './block.js';
import { TeiList, TeiItem } from './list.js';
import { TeiEmptyElement } from './empty.js';
import { TeiAnchor } from './footnote.js';

/**
 * Create nodes and marks from a schema definition.
 * 
 * @param {Object} schemaDef - The schema definition
 * @returns {Array} - nodes and marks
 */
export function createFromSchema(schemaDef) {
    const extensions = [
        TeiDocument,
        Text,
    ];
    Object.entries(schemaDef.schema).forEach(([name, def]) => {
        let NodeOrMark; 
        if (def.type === 'inline') {
            NodeOrMark = TeiInline.extend({
                name: name
            });
        } else if (def.type === 'anchor') {
            NodeOrMark = TeiAnchor.extend({
                name: name
            });
        } else if (def.type === 'empty') {
            NodeOrMark = TeiEmptyElement.extend({
                name: name
            });
        } else if (def.type === 'list') {
            NodeOrMark = TeiList.extend({
                name: name,
                content: def.content || 'item+'
            });
        } else if (def.type === 'listItem') {
            NodeOrMark = TeiItem.extend({
                name: name,
                content: def.content || 'p block*'
            });
        } else if (def.type === 'block') {
            NodeOrMark = TeiBlock.extend({
                name: name,
                group: def.group || 'block',
                defining: def.defining,
                isolating: def.isolating,
                priority: def.priority,
                inline: def.inline,
                content: def.content
            });
        }
        // Merge global attributes with node-specific attributes
        const attributes = { ...schemaDef.attributes, ...def.attributes };
        extensions.push(NodeOrMark.configure({
            shortcuts: def.keyboard,
            attributes: attributes,
            label: def.label
        }));
    });
    return extensions;
}

// Custom document extension that requires tei-div
const TeiDocument = Document.extend({
    content: 'block+ noteGrp?'
});