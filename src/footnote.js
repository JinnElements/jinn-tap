import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Extension, minMax } from "@tiptap/core";
import { ReplaceStep } from "@tiptap/pm/transform";
import { TeiEmptyElement } from './empty.js';

// Function to generate a unique ID
function generateUniqueId() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `fn-${timestamp}-${randomStr}`;
}

export const TeiAnchor = TeiEmptyElement.extend({
    name: "anchor",
    group: "inline",
    content: "",
    inline: true,
    atom: true,

    addAttributes() {
        const attributes = {
            "id": {
                default: generateUniqueId(),
                renderHTML(attributes) {
                    return { id: attributes.id };
                },
                parseHTML(element) {
                    return {
                        id: element.getAttribute("id"),
                    };
                }
            }
        };
        if (this.options.attributes) {
            Object.entries(this.options.attributes).forEach(([attrName, attrDef]) => {
                attributes[attrName] = {
                    default: attrDef.default || null,
                    parseHTML: element => element.getAttribute(attrName),
                    renderHTML: attributes => {
                        if (!attributes[attrName]) {
                            return {}
                        }
                        return {
                            [attrName]: attributes[attrName],
                        }
                    },
                };
            });
        }
        return attributes;
    },

    addNodeView() {
        return ({ node }) => {
            const dom = document.createElement(`tei-${this.name}`);
            dom.innerHTML = this.options.label;
            
            // Set all attributes on the DOM element
            Object.entries(node.attrs).forEach(([key, value]) => {
                if (value) {
                    dom.setAttribute(key, value);
                }
            });

            dom.addEventListener('click', () => {
                this.editor.options.element.dispatchEvent(new CustomEvent('empty-element-clicked', { detail: { node } }));
            });
            return {
                dom,
                update: (updatedNode) => {
                    if (updatedNode.type !== node.type) {
                        return false;
                    }
                    node.attrs = updatedNode.attrs;
                    // Update all attributes on the DOM element
                    Object.entries(node.attrs).forEach(([key, value]) => {
                        if (value) {
                            dom.setAttribute(key, value);
                        } else {
                            dom.removeAttribute(key);
                        }
                    });
                    return true;
                }
            }
        }
    }
});

export const FootnoteRules = Extension.create({
    name: "footnoteRules",
    priority: 1000,
    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey("footnoteRules"),
                appendTransaction(transactions, oldState, newState) {
                    let newTr = newState.tr;
                    let refsChanged = false; // true if the footnote references have been changed, false otherwise
                    let anchorId = null; // Store the ID of the newly inserted anchor

                    for (let tr of transactions) {
                        if (!tr.docChanged) continue;
                        if (refsChanged) break;

                        for (let step of tr.steps) {
                            if (!(step instanceof ReplaceStep)) continue;
                            if (refsChanged) break;

                            const isDelete = step.from != step.to; // the user deleted items from the document (from != to & the step is a replace step)
                            const isInsert = step.slice.size > 0;

                            // check if any footnote references have been inserted
                            if (isInsert) {
                                step.slice.content.descendants((node, pos) => {
                                    if (node?.type.name == "anchor") {
                                        refsChanged = true;
                                        anchorId = node.attrs["id"];
                                        return false;
                                    }
                                });
                            }
                        }
                    }
                    if (refsChanged && anchorId) {
                        // Find existing noteGrp or create one at end
                        let noteGrpPos = null;
                        newState.doc.descendants((node, pos) => {
                            if (node.type.name === 'noteGrp') {
                                noteGrpPos = pos;
                                return false;
                            }
                        });

                        if (noteGrpPos === null) {
                            // Create noteGrp at end of document
                            noteGrpPos = newState.doc.content.size;
                            newTr = newTr.insert(noteGrpPos, newState.schema.nodes.noteGrp.create());
                        }

                        // Get the noteGrp node after the transaction
                        const noteGrpNode = newTr.doc.nodeAt(noteGrpPos);
                        if (!noteGrpNode) {
                            console.warn('Failed to find or create noteGrp node');
                            return null;
                        }

                        // Insert a new note at the end of the noteGrp with a reference to the anchor
                        const noteNode = newState.schema.nodes.note.create({ 'target': `#${anchorId}` });
                        const insertPos = noteGrpPos + noteGrpNode.nodeSize - 1;
                        
                        // Insert the note and create a paragraph inside it
                        newTr = newTr.insert(insertPos, noteNode);
                        
                        // Get the position after the note was inserted
                        const notePos = insertPos;
                        const note = newTr.doc.nodeAt(notePos);
                        
                        if (note) {
                            // Set the selection to the start of the paragraph
                            newTr = newTr.setSelection(TextSelection.create(
                                newTr.doc,
                                notePos + 1
                            ));
                        }
                        
                        return newTr;
                    }
                }
            })
        ]
    }
});

export default FootnoteRules;