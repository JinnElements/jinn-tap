import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Extension } from "@tiptap/core";
import { ReplaceStep } from "@tiptap/pm/transform";
import { TeiEmptyElement } from './empty.js';

// Function to generate a unique ID
function generateUniqueId() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `fn-${timestamp}-${randomStr}`;
}

// Map to store references for each anchor node
const anchorReferences = new Map();

// Function to compute reference numbers for all anchors in the document
function computeAnchorReferences(doc) {
    const anchors = [];
    doc.descendants((node, pos) => {
        if (node.type.name === 'anchor') {
            anchors.push({ node, pos });
        }
    });
    
    // Sort anchors by their position in the document
    anchors.sort((a, b) => a.pos - b.pos);
    
    // Clear the previous references
    anchorReferences.clear();
    
    // Assign reference numbers
    anchors.forEach((anchor, index) => {
        // Store the reference in the map using the node's ID as the key
        anchorReferences.set(anchor.node.attrs.id, index + 1);
    });
    return anchors;
}

// Function to get the reference for a specific anchor
function getAnchorReference(nodeId) {
    return anchorReferences.get(nodeId) || -1;
}

// Function to update data-reference attributes of all notes
function updateNoteReferences(tr, doc) {
    doc.descendants((node, pos) => {
        if (node.type.name === 'note') {
            const target = node.attrs.target;
            if (target && target.startsWith('#')) {
                const anchorId = target.substring(1);
                const reference = getAnchorReference(anchorId);
                if (reference > 0) {
                    tr = tr.setNodeMarkup(pos, null, {
                        ...node.attrs,
                        'data-reference': reference.toString(),
                        _timestamp: Date.now()
                    });
                }
            }
        }
    });
    return tr;
}

// Function to update all anchor nodes to force a re-render
function updateAnchorNodes(tr, doc) {
    const anchors = [];
    doc.descendants((node, pos) => {
        if (node.type.name === 'anchor') {
            anchors.push({ node, pos });
        }
    });
    
    anchors.forEach(anchor => {
        tr = tr.setNodeMarkup(anchor.pos, null, {
            ...anchor.node.attrs,
            _timestamp: Date.now()
        });
    });
    return tr;
}

export const TeiAnchor = TeiEmptyElement.extend({
    name: "anchor",
    group: "inline",
    content: "text*",
    inline: true,
    atom: true,

    addAttributes() {
        const attributes = {
            "id": {
                isRequired: true,
                renderHTML(attributes) {
                    return { id: attributes.id };
                },
                parseHTML(element) {
                    return {
                        id: element.getAttribute("id") || generateUniqueId(),
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

    addCommands() {
        return {
            addAnchor: (attributes) => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: {
                        ...attributes,
                        id: generateUniqueId()
                    }
                });
            }
        };
    },

    addNodeView() {
        return ({ node }) => {
            const dom = document.createElement(`tei-${this.name}`);
            // Display the reference from the map
            const reference = getAnchorReference(node.attrs.id);
            dom.innerHTML = reference > 0 ? reference.toString() : '';
            
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
                    // Update the displayed reference number from the map
                    const reference = getAnchorReference(node.attrs.id);
                    dom.innerHTML = reference > 0 ? reference.toString() : '';
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
                    let anchorId = null; // Store the ID of the newly inserted anchor
                    let docChanged = false; // Track if the document has changed in any way
                    let referencesUpdated = false; // Track if references were updated

                    // Check if the document has changed in any way
                    for (let tr of transactions) {
                        if (tr.docChanged) {
                            docChanged = true;
                            break;
                        }
                    }

                    // If the document has changed, recompute all references
                    if (docChanged) {
                        computeAnchorReferences(newState.doc);
                        referencesUpdated = true;
                    }

                    // Check for newly inserted anchors
                    for (let tr of transactions) {
                        if (!tr.docChanged) continue;
                        if (anchorId) break;

                        for (let step of tr.steps) {
                            if (!(step instanceof ReplaceStep)) continue;
                            if (anchorId) break;

                            const isInsert = step.slice.size > 0;

                            // check if any footnote references have been inserted
                            if (isInsert) {
                                step.slice.content.descendants((node, pos) => {
                                    if (node?.type.name == "anchor") {
                                        anchorId = node.attrs["id"];
                                        return false;
                                    }
                                });
                            }
                        }
                    }
                    
                    if (anchorId) {
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
                        const noteNode = newState.schema.nodes.note.create({ 
                            'target': `#${anchorId}`,
                            'data-reference': getAnchorReference(anchorId).toString()
                        });
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
                    }
                    
                    // If references were updated, force a re-render of all anchor nodes
                    if (referencesUpdated) {
                        // Update all anchor nodes
                        newTr = updateAnchorNodes(newTr, newState.doc);
                        // Update all note references
                        newTr = updateNoteReferences(newTr, newState.doc);
                    }
                    
                    return newTr;
                }
            })
        ]
    }
});

export default FootnoteRules;