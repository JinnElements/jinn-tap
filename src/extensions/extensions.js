import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import { JinnInline } from './inline.js';
import { JinnBlock } from './block.js';
import { JinnList, JinnItem } from './list.js';
import { JinnEmptyElement } from './empty.js';
import { JinnAnchor } from './anchor.js';
import { JinnGraphic } from './graphic.js';
/**
 * Create nodes and marks from a schema definition.
 * 
 * @param {Object} schemaDef - The schema definition
 * @returns {Array} - nodes and marks
 */
export function createFromSchema(schemaDef) {
    const extensions = [
        JinnDocument,
        Text,
    ];
    Object.entries(schemaDef.schema).forEach(([name, def]) => {
        let NodeOrMark;
        switch (def.type) {
            case 'inline':
                NodeOrMark = JinnInline.extend({
                    name: name
                });
                break;
            case 'anchor':
                NodeOrMark = JinnAnchor.extend({
                    name: name
                });
                break;
            case 'empty':
                NodeOrMark = JinnEmptyElement.extend({
                    name: name
                });
                break;
            case 'list':
                NodeOrMark = JinnList.extend({
                    name: name,
                    content: def.content || 'item+'
                });
                break;
            case 'listItem':
                NodeOrMark = JinnItem.extend({
                    name: name,
                    content: def.content || 'p block*'
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
                    selectable: def.selectable
                });
                break;
            case 'graphic':
                NodeOrMark = JinnGraphic.extend({
                    name: name
                });
                break;
        }
        // Merge global attributes with node-specific attributes
        const attributes = { ...schemaDef.attributes, ...def.attributes };
        const config = {
            shortcuts: def.keyboard,
            attributes: attributes,
            label: def.label
        };
        if (def.inputRules) {
            config.inputRules = def.inputRules;
        }
        extensions.push(NodeOrMark.configure(config));
    });
    return extensions;
}

// Custom document extension
const JinnDocument = Document.extend({
    content: 'block+ listAnnotation?'
});