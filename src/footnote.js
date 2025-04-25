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
    doc.nodesBetween(0, doc.content.size, (node, pos) => {
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
        const refNumber = index + 1;
        // Store the reference in the map using the node's ID as the key
        anchorReferences.set(anchor.node.attrs.id, refNumber);
    });
    
    return anchors;
}

// Function to get the reference for a specific anchor
function getAnchorReference(nodeId) {
    return anchorReferences.get(nodeId) || -1;
}

// Function to update _reference attributes of all notes
function updateNoteReferences(tr, doc) {
    doc.nodesBetween(0, doc.content.size, (node, pos) => {
        if (node.type.name === 'note') {
            const target = node.attrs.target;
            if (target && target.startsWith('#')) {
                const anchorId = target.substring(1);
                const reference = getAnchorReference(anchorId);
                if (reference > 0) {
                    tr = tr.setNodeMarkup(pos, null, {
                        ...node.attrs,
                        _reference: reference.toString(),
                        _timestamp: Date.now()
                    });
                }
            }
        }
    });
    return tr;
}

// Function to reorder notes according to their reference numbers
function reorderNotes(tr, doc, notesWrapper,targetNoteId = null) {
    // Find the listAnnotation
    let listAnnotationPos = null;
    doc.descendants((node, pos) => {
        if (node.type.name === notesWrapper) {
            listAnnotationPos = pos;
            return false;
        }
    });

    if (listAnnotationPos === null) return tr;

    const listAnnotationNode = doc.nodeAt(listAnnotationPos);
    if (!listAnnotationNode) return tr;

    // Collect all notes with their reference numbers and positions
    const notes = [];
    let targetNoteIndex = -1;
    
    listAnnotationNode.content.forEach((node, offset) => {
        if (node.type.name === 'note') {
            const target = node.attrs.target;
            if (target && target.startsWith('#')) {
                const anchorId = target.substring(1);
                const reference = getAnchorReference(anchorId);
                notes.push({ node, reference, originalIndex: notes.length });
                
                // If this is our target note, remember its index
                if (targetNoteId && target === `#${targetNoteId}`) {
                    targetNoteIndex = notes.length - 1;
                }
            }
        }
    });

    // Sort notes by reference number
    notes.sort((a, b) => a.reference - b.reference);

    // Find where our target note ended up after sorting
    let newTargetIndex = -1;
    if (targetNoteIndex !== -1) {
        newTargetIndex = notes.findIndex(n => n.originalIndex === targetNoteIndex);
    }

    // Create a new listAnnotation with sorted notes
    const newlistAnnotation = listAnnotationNode.type.create(
        listAnnotationNode.attrs,
        notes.map(n => n.node)
    );

    // Replace the old listAnnotation with the new one
    tr = tr.replaceWith(listAnnotationPos, listAnnotationPos + listAnnotationNode.nodeSize, newlistAnnotation);

    // If we had a target note, update the selection to its new position
    if (newTargetIndex !== -1) {
        const newNotePos = listAnnotationPos + 1; // +1 to skip the listAnnotation opening tag
        let currentPos = newNotePos;
        
        // Move through notes until we reach our target
        for (let i = 0; i < newTargetIndex; i++) {
            const node = tr.doc.nodeAt(currentPos);
            if (node) {
                currentPos += node.nodeSize;
            }
        }
        
        tr = tr.setSelection(TextSelection.create(
            tr.doc,
            currentPos + 1
        ));
    }

    return tr;
}

// Function to update all anchor nodes to force a re-render
function updateAnchorNodes(tr, doc) {
    // Generate a unique timestamp for this update batch
    const batchTimestamp = Date.now();
    
    doc.nodesBetween(0, doc.content.size, (node, pos) => {
        if (node.type.name === 'anchor') {
            const reference = getAnchorReference(node.attrs.id);
            
            // Create a unique timestamp for each node to force re-render
            const uniqueTimestamp = `${batchTimestamp}-${pos}`;
            
            tr = tr.setNodeMarkup(pos, null, {
                ...node.attrs,
                _timestamp: uniqueTimestamp,
                _reference: reference // Store reference in attrs to ensure update
            });
        }
    });
    return tr;
}

export const TeiAnchor = TeiEmptyElement.extend({
    name: "anchor",
    group: "inline",
    content: "",  // Atomic nodes should not have content
    inline: true,
    atom: true,

    addAttributes() {
        const attributes = {
            "id": {
                isRequired: true,
                type: "string",
                renderHTML(attributes) {
                    return { id: attributes.id };
                },
                parseHTML(element) {
                    return element.getAttribute("id") || generateUniqueId();
                }
            },
            "_timestamp": {
                default: null,
                renderHTML: () => ({}),
            },
            "_reference": {
                default: null,
                renderHTML: () => ({}),
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
            },
            gotoNote: (id) => ({ commands, editor }) => {
                const noteSelector = `tei-note[target="#${id}"]`;
                const noteElement = editor.view.dom.querySelector(noteSelector);
                
                if (noteElement) {
                    // Scroll note into view
                    noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Set selection at start of note
                    const pos = this.editor.view.posAtDOM(noteElement, 0);
                    commands.setTextSelection(pos);
                    return true;
                }
                return false;
            }
        };
    },

    addNodeView() {
        return ({ node, editor }) => {
            const dom = document.createElement(`tei-${this.name}`);
            
            // Set all attributes on the DOM element
            Object.entries(node.attrs).forEach(([key, value]) => {
                if (value) {
                    dom.setAttribute(key, value);
                }
            });

            // Get the reference number and set it as text content
            const reference = getAnchorReference(node.attrs.id);
            dom.textContent = reference > 0 ? reference.toString() : '';

            dom.addEventListener('click', () => {
                editor.commands.gotoNote(node.attrs.id);
            });

            return {
                dom,
                update: (updatedNode) => {
                    if (updatedNode.type !== node.type) {
                        return false;
                    }
                    
                    // Update attributes
                    Object.entries(updatedNode.attrs).forEach(([key, value]) => {
                        if (value) {
                            dom.setAttribute(key, value);
                        } else {
                            dom.removeAttribute(key);
                        }
                    });

                    // Update the text content with the new reference number
                    const reference = getAnchorReference(updatedNode.attrs.id);
                    dom.textContent = reference > 0 ? reference.toString() : '';
                    
                    return true;
                }
            }
        }
    }
});

export const FootnoteRules = Extension.create({
    name: "footnoteRules",
    priority: 1000,
    addOptions() {
        return {
            notesWrapper: 'listAnnotation'
        }
    },
    addProseMirrorPlugins() {
        const options = this.options;
        return [
            new Plugin({
                key: new PluginKey("footnoteRules"),
                appendTransaction(transactions, oldState, newState) {
                    let newTr = newState.tr;
                    let anchorId = null; // Store the ID of the newly inserted anchor
                    let referencesNeedUpdate = false; // Track if references need to be updated
                    let deletedAnchorIds = new Set(); // Track IDs of deleted anchors

                    // Check for complete document replacement
                    const isCompleteReplacement = transactions.some(tr => {
                        return tr.steps.some(step => {
                            if (step instanceof ReplaceStep) {
                                return step.from === 0 && step.to === oldState.doc.content.size;
                            }
                            return false;
                        });
                    });

                    if (isCompleteReplacement) {
                        referencesNeedUpdate = true;
                    } else {
                        // Check for newly inserted anchors and document changes
                        for (let tr of transactions) {
                            if (!tr.docChanged) continue;

                            for (let step of tr.steps) {
                                if (!(step instanceof ReplaceStep)) continue;

                                const isInsert = step.slice.size > 0;
                                if (isInsert) {
                                    // Check for new anchor nodes
                                    step.slice.content.descendants((node, pos) => {
                                        if (node?.type.name == "anchor") {
                                            anchorId = node.attrs["id"];
                                            referencesNeedUpdate = true;
                                            return false;
                                        }
                                    });
                                }

                                // Check for deleted anchors
                                const oldDoc = tr.docs[0];
                                const newDoc = tr.doc;
                                const oldAnchors = new Map();
                                const newAnchors = new Map();
                                
                                oldDoc.descendants((node, pos) => {
                                    if (node.type.name === 'anchor') {
                                        oldAnchors.set(node.attrs.id, pos);
                                    }
                                });
                                
                                newDoc.descendants((node, pos) => {
                                    if (node.type.name === 'anchor') {
                                        newAnchors.set(node.attrs.id, pos);
                                    }
                                });

                                // Find deleted anchors by comparing old and new maps
                                for (const [id, pos] of oldAnchors) {
                                    if (!newAnchors.has(id)) {
                                        deletedAnchorIds.add(id);
                                        referencesNeedUpdate = true;
                                    }
                                }

                                // Check if any anchor positions changed
                                if (oldAnchors.size !== newAnchors.size || 
                                    Array.from(oldAnchors.entries()).some(([id, pos]) => newAnchors.get(id) !== pos)) {
                                    referencesNeedUpdate = true;
                                }
                            }
                        }
                    }

                    // Remove notes associated with deleted anchors
                    if (deletedAnchorIds.size > 0) {
                        newState.doc.descendants((node, pos) => {
                            if (node.type.name === 'note') {
                                const target = node.attrs.target;
                                if (target && target.startsWith('#')) {
                                    const anchorId = target.substring(1);
                                    if (deletedAnchorIds.has(anchorId)) {
                                        newTr = newTr.delete(pos, pos + node.nodeSize);
                                    }
                                }
                            }
                        });
                    }

                    // Handle new anchor creation
                    if (anchorId) {
                        // Check if a note with this target already exists
                        let noteExists = false;
                        newState.doc.descendants((node, pos) => {
                            if (node.type.name === 'note' && node.attrs.target === `#${anchorId}`) {
                                console.log('note found', node);
                                noteExists = true;
                                return false;
                            }
                        });

                        if (noteExists) {
                            return null;
                        }
                        // Find existing listAnnotation or create one at end
                        let listAnnotationPos = null;
                        newState.doc.descendants((node, pos) => {
                            if (node.type.name === options.notesWrapper) {
                                listAnnotationPos = pos;
                                return false;
                            }
                        });

                        if (listAnnotationPos === null) {
                            // Create listAnnotation at end of document
                            listAnnotationPos = newState.doc.content.size;
                            newTr = newTr.insert(listAnnotationPos, newState.schema.nodes.listAnnotation.create());
                        }

                        // Get the listAnnotation node after the transaction
                        const listAnnotationNode = newTr.doc.nodeAt(listAnnotationPos);
                        if (!listAnnotationNode) {
                            return null;
                        }

                        // Insert a new note at the end of the listAnnotation with a reference to the anchor
                        const noteNode = newState.schema.nodes.note.create({ 
                            'target': `#${anchorId}`,
                            '_reference': '1' // Will be updated later
                        });
                        const insertPos = listAnnotationPos + listAnnotationNode.nodeSize - 1;
                        
                        // Insert the note and create a paragraph inside it
                        newTr = newTr.insert(insertPos, noteNode);
                        
                        // Get the position after the note was inserted
                        const notePos = insertPos;
                        const note = newTr.doc.nodeAt(notePos);
                        
                        if (note) {
                            // Set the selection to the start of the note
                            newTr = newTr.setSelection(TextSelection.create(
                                newTr.doc,
                                notePos + 1
                            ));
                        }
                    }
                    
                    // Update references if needed using the final document state
                    if (referencesNeedUpdate) {
                        // Compute references based on the current transaction state
                        computeAnchorReferences(newTr.doc);
                        
                        // Update all anchor nodes
                        newTr = updateAnchorNodes(newTr, newTr.doc);
                        
                        // Update all note references
                        newTr = updateNoteReferences(newTr, newTr.doc);
                        
                        // Reorder notes
                        newTr = reorderNotes(newTr, newTr.doc, options.notesWrapper, anchorId);
                    }
                    
                    return newTr;
                }
            })
        ]
    }
});

export default FootnoteRules;