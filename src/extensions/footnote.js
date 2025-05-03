import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Extension } from "@tiptap/core";
import { ReplaceStep } from "@tiptap/pm/transform";

// Map to store references for each anchor node
const anchorReferences = new Map();

// Function to compute reference numbers for all anchors in the document
function computeAnchorReferences(doc) {
    const anchors = [];
    const notes = new Map();
    doc.nodesBetween(0, doc.content.size, (node, pos) => {
        if (node.type.name === 'anchor') {
            anchors.push({ node, pos });
        } else if (node.type.name === 'note' && node.attrs.n) {
            notes.set(node.attrs.target, node.attrs.n);
        }
    });
    
    // Clear the previous references
    anchorReferences.clear();
    
    // Assign reference numbers
    let count = 0;
    anchors.forEach((anchor) => {
        let refNumber;
        const target = `#${anchor.node.attrs.id}`;
        if (notes.has(target)) {
            refNumber = notes.get(target);
        } else {
            refNumber = ++count;
        }
        // Store the reference in the map using the node's ID as the key
        anchorReferences.set(anchor.node.attrs.id, refNumber.toString());
    });
    
    return anchors;
}

// Function to get the reference for a specific anchor
export function getAnchorReference(nodeId) {
    return anchorReferences.get(nodeId);
}

// Function to update _reference attributes of all notes
function updateNoteReferences(tr, doc) {
    doc.nodesBetween(0, doc.content.size, (node, pos) => {
        if (node.type.name === 'note') {
            const target = node.attrs.target;
            if (target && target.startsWith('#')) {
                const anchorId = target.substring(1);
                const reference = getAnchorReference(anchorId);
                if (reference) {
                    tr = tr.setNodeMarkup(pos, null, {
                        ...node.attrs,
                        _reference: reference.toString(),
                        _timestamp: Date.now()
                    });
                } else {
                    const { target, _reference, ...attrs } = node.attrs;
                    tr = tr.setNodeMarkup(pos, null, {
                        ...attrs,
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
            let reference;
            if (target && target.startsWith('#')) {
                const anchorId = target.substring(1);
                reference = getAnchorReference(anchorId);
            }
            notes.push({ node, reference, originalIndex: notes.length });
            
            // If this is our target note, remember its index
            if (targetNoteId && target === `#${targetNoteId}`) {
                targetNoteIndex = notes.length - 1;
            }
        }
    });

    // Sort notes by reference using natural string comparison
    notes.sort((a, b) => {
        if (!a.reference && !b.reference) return 0;
        if (!a.reference) return 1;
        if (!b.reference) return -1;
        return a.reference.localeCompare(b.reference);
    });

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
                _reference: reference.toString() // Ensure reference is stored as string
            });
        }
    });
    return tr;
}

export const FootnoteRules = Extension.create({
    name: "footnoteRules",
    priority: 1000,
    addOptions() {
        return {
            notesWrapper: 'listAnnotation',
            notesWithoutAnchor: false
        }
    },
    addCommands() {
        return {
            addNote: () => ({ commands, state }) => {
                return commands.insertContent({
                    type: 'note',
                    attrs: {
                        '_timestamp': Date.now()
                    },
                    content: [{
                        type: 'p'
                    }]
                });
            },
            updateNotes: () => ({ commands, state }) => {
                let tr = state.tr;
                // Compute references based on the current transaction state
                computeAnchorReferences(tr.doc);

                // Update all anchor nodes
                tr = updateAnchorNodes(tr, tr.doc);

                // Update all note references
                tr = updateNoteReferences(tr, tr.doc);

                // Reorder notes
                tr = reorderNotes(tr, tr.doc, this.options.notesWrapper);
                return true;
            }
        }
    },
    addProseMirrorPlugins() {
        const options = this.options;
        return [
            new Plugin({
                key: new PluginKey("footnoteRules"),
                appendTransaction(transactions, oldState, newState) {
                    const isRemoteTransaction = transactions.every(tr => tr.meta['y-sync$'] !== undefined);
                    if (isRemoteTransaction) {
                        return null;
                    }

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
                                        if (!options.notesWithoutAnchor) {
                                            newTr = newTr.delete(pos, pos + node.nodeSize);
                                        } else {
                                            const { target, _reference, ...attrs } = node.attrs;
                                            newTr = newTr.setNodeMarkup(pos, null, {
                                                ...attrs,
                                                _timestamp: Date.now()
                                            });
                                        }
                                    }
                                }
                            }
                        });
                    }

                    // Handle new anchor creation
                    if (anchorId) {
                        if (options.notesWithoutAnchor) {
                            let foundNote = false;
                            newState.doc.descendants((node, pos) => {
                                if (node.type.name === 'note' && !node.attrs.target) {
                                    foundNote = true;
                                    return false;
                                }
                            });
                            if (foundNote) {
                                return null;
                            }
                        }
                        // Check if a note with this target already exists
                        let noteExists = false;
                        newState.doc.descendants((node, pos) => {
                            if (node.type.name === 'note' && node.attrs.target === `#${anchorId}`) {
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
                            '_reference': '1', // Will be updated later
                            '_timestamp': Date.now()
                        }, [
                            newState.schema.nodes.p.create({}, [])
                        ]);
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

                            // Add scroll to the transaction
                            newTr.scrollIntoView();
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