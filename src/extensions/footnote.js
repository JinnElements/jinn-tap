import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Extension } from '@tiptap/core';
import { ReplaceStep } from '@tiptap/pm/transform';

// Map to store references for each anchor node
const anchorReferences = new Map();

// Helper functions to handle different link directions
function getNoteLink(note, linkDirection) {
    if (linkDirection === 'note-to-anchor') {
        return note.attrs.target;
    } else {
        // anchor-to-note: link is stored on anchor, not note
        return null;
    }
}

function getAnchorLink(anchor, linkDirection) {
    if (linkDirection === 'anchor-to-note') {
        return anchor.attrs.rid || anchor.attrs.target;
    } else {
        // note-to-anchor: link is stored on note, not anchor
        return null;
    }
}

function findNoteByAnchor(doc, anchorId, noteName, linkDirection) {
    let foundNote = null;
    doc.nodesBetween(0, doc.content.size, (node, pos) => {
        if (node.type.name === noteName) {
            if (linkDirection === 'note-to-anchor') {
                const target = node.attrs.target;
                if (target && target.startsWith('#') && target.substring(1) === anchorId) {
                    foundNote = { node, pos };
                    return false;
                }
            } else {
                // anchor-to-note: note has id, anchor has rid pointing to it
                if (node.attrs.id === anchorId) {
                    foundNote = { node, pos };
                    return false;
                }
            }
        }
    });
    return foundNote;
}

function findAnchorByNote(doc, noteId, anchorName, linkDirection) {
    let foundAnchor = null;
    doc.nodesBetween(0, doc.content.size, (node, pos) => {
        if (node.type.name === anchorName) {
            if (linkDirection === 'anchor-to-note') {
                // JATS: anchor.rid points to note.id
                const rid = node.attrs.rid || node.attrs.target;
                if (rid) {
                    const ridId = rid.startsWith('#') ? rid.substring(1) : rid;
                    if (ridId === noteId) {
                        foundAnchor = { node, pos };
                        return false;
                    }
                }
            } else {
                // TEI: anchor has id, note has target pointing to it
                // This function finds anchor by note, so we'd need note.target to match anchor.id
                // But that's the reverse - we want findNoteByAnchor for TEI
                // This function is mainly for JATS
            }
        }
    });
    return foundAnchor;
}

// Function to compute reference numbers for all anchors in the document
function computeAnchorReferences(doc, anchorName, noteName, linkDirection) {
    const anchors = [];
    const notes = new Map(); // Map note identifier to 'n' attribute value (if exists)
    const noteLinks = new Map(); // Map note identifier to anchor ID for linking
    
    // Build map of notes: for TEI use target, for JATS use id
    // Process ALL notes, not just those with 'n' attribute
    doc.nodesBetween(0, doc.content.size, (node, pos) => {
        if (node.type.name === noteName) {
            if (linkDirection === 'note-to-anchor') {
                // TEI: use target as key
                const target = node.attrs.target;
                if (target) {
                    const anchorId = target.startsWith('#') ? target.substring(1) : target;
                    noteLinks.set(target, anchorId);
                    // Preserve existing 'n' attribute if present
                    if (node.attrs.n) {
                        notes.set(target, node.attrs.n);
                    }
                }
            } else {
                // JATS: use id as key
                const noteId = node.attrs.id;
                if (noteId) {
                    // Find anchor pointing to this note
                    const anchor = findAnchorByNote(doc, noteId, anchorName, linkDirection);
                    if (anchor) {
                        noteLinks.set(noteId, anchor.node.attrs.id);
                    }
                    // Preserve existing 'n' attribute if present
                    if (node.attrs.n) {
                        notes.set(noteId, node.attrs.n);
                    }
                }
            }
        }
    });

    // Collect anchors
    doc.nodesBetween(0, doc.content.size, (node, pos) => {
        if (node.type.name === anchorName) {
            anchors.push({ node, pos });
        }
    });

    // Clear the previous references
    anchorReferences.clear();

    // Assign reference numbers
    let count = 0;
    anchors.forEach((anchor) => {
        let refNumber;
        const anchorId = anchor.node.attrs.id;
        
        if (linkDirection === 'note-to-anchor') {
            // TEI: find note with target pointing to this anchor
            const target = `#${anchorId}`;
            if (notes.has(target)) {
                // Use existing 'n' attribute value
                refNumber = notes.get(target);
            } else if (noteLinks.has(target)) {
                // Note exists but no 'n' attribute, assign sequential number
                refNumber = ++count;
            } else {
                // No note linked to this anchor yet
                refNumber = ++count;
            }
        } else {
            // JATS: anchor.rid points to note.id
            const rid = getAnchorLink(anchor.node, linkDirection);
            if (rid) {
                const noteId = rid.startsWith('#') ? rid.substring(1) : rid;
                if (notes.has(noteId)) {
                    // Use existing 'n' attribute value
                    refNumber = notes.get(noteId);
                } else if (noteLinks.has(noteId)) {
                    // Note exists but no 'n' attribute, assign sequential number
                    refNumber = ++count;
                } else {
                    // No note linked to this anchor yet
                    refNumber = ++count;
                }
            } else {
                // Anchor has no rid, assign sequential number
                refNumber = ++count;
            }
        }
        
        // Store the reference in the map using the node's ID as the key
        anchorReferences.set(anchorId, refNumber.toString());
    });

    return anchors;
}

// Helper to generate a note ID if it doesn't have one
function generateNoteId(node, pos) {
    return `note-${pos}`;
}

// Function to get the reference for a specific anchor
export function getAnchorReference(nodeId) {
    return anchorReferences.get(nodeId);
}

// Function to update _reference attributes of all notes
function updateNoteReferences(tr, doc, noteName, anchorName, linkDirection) {
    doc.nodesBetween(0, doc.content.size, (node, pos) => {
        if (node.type.name === noteName) {
            let reference = null;
            const noteId = node.attrs.id || generateNoteId(node, pos);
            
            if (linkDirection === 'note-to-anchor') {
                // TEI: note.target -> anchor.id
                const target = node.attrs.target;
                if (target && target.startsWith('#')) {
                    const anchorId = target.substring(1);
                    reference = getAnchorReference(anchorId);
                }
            } else {
                // JATS: anchor.rid -> note.id, find anchor pointing to this note
                const anchor = findAnchorByNote(doc, noteId, anchorName, linkDirection);
                if (anchor) {
                    reference = getAnchorReference(anchor.node.attrs.id);
                }
            }
            
            if (reference) {
                tr = tr.setNodeMarkup(pos, null, {
                    ...node.attrs,
                    _reference: reference.toString(),
                    _timestamp: Date.now(),
                });
            } else {
                const { target, _reference, rid, ...attrs } = node.attrs;
                tr = tr.setNodeMarkup(pos, null, {
                    ...attrs,
                    _timestamp: Date.now(),
                });
            }
        }
    });
    return tr;
}

// Function to reorder notes according to their reference numbers
function reorderNotes(tr, doc, notesWrapper, noteName, anchorName, linkDirection, targetNoteId = null) {
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
        if (node.type.name === noteName) {
            let reference = null;
            const noteId = node.attrs.id || generateNoteId(node, offset);
            
            if (linkDirection === 'note-to-anchor') {
                // TEI: note.target -> anchor.id
                const target = node.attrs.target;
                if (target && target.startsWith('#')) {
                    const anchorId = target.substring(1);
                    reference = getAnchorReference(anchorId);
                }
            } else {
                // JATS: anchor.rid -> note.id
                const anchor = findAnchorByNote(doc, noteId, anchorName, linkDirection);
                if (anchor) {
                    reference = getAnchorReference(anchor.node.attrs.id);
                }
            }
            
            notes.push({ node, reference, originalIndex: notes.length });

            // If this is our target note, remember its index
            if (targetNoteId) {
                if (linkDirection === 'note-to-anchor') {
                    if (node.attrs.target === `#${targetNoteId}`) {
                        targetNoteIndex = notes.length - 1;
                    }
                } else {
                    if (noteId === targetNoteId) {
                        targetNoteIndex = notes.length - 1;
                    }
                }
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
        newTargetIndex = notes.findIndex((n) => n.originalIndex === targetNoteIndex);
    }

    // Create a new listAnnotation with sorted notes
    const newlistAnnotation = listAnnotationNode.type.create(
        listAnnotationNode.attrs,
        notes.map((n) => n.node),
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

        tr = tr.setSelection(TextSelection.create(tr.doc, currentPos + 1));
    }

    return tr;
}

// Function to update all anchor nodes to force a re-render
function updateAnchorNodes(tr, doc, anchorName) {
    // Generate a unique timestamp for this update batch
    const batchTimestamp = Date.now();

    doc.nodesBetween(0, doc.content.size, (node, pos) => {
        if (node.type.name === anchorName) {
            const reference = getAnchorReference(node.attrs.id);

            // Create a unique timestamp for each node to force re-render
            const uniqueTimestamp = `${batchTimestamp}-${pos}`;

            tr = tr.setNodeMarkup(pos, null, {
                ...node.attrs,
                _timestamp: uniqueTimestamp,
                _reference: reference.toString(), // Ensure reference is stored as string
            });
        }
    });
    return tr;
}

export const FootnoteRules = Extension.create({
    name: 'footnoteRules',
    priority: 1000,
    addOptions() {
        return {
            notesWrapper: 'listAnnotation',
            notesWithoutAnchor: false,
            noteName: 'note',
            anchorName: 'anchor',
            linkDirection: 'note-to-anchor', // 'note-to-anchor' (TEI) or 'anchor-to-note' (JATS)
        };
    },
    addCommands() {
        return {
            addNote:
                () =>
                ({ commands, state }) => {
                    return commands.insertContent({
                        type: this.options.noteName,
                        attrs: {
                            _timestamp: Date.now(),
                        },
                        content: [
                            {
                                type: 'p',
                            },
                        ],
                    });
                },
            updateNotes:
                () =>
                ({ commands, state }) => {
                    let tr = state.tr;
                    // Compute references based on the current transaction state
                    computeAnchorReferences(tr.doc, this.options.anchorName, this.options.noteName, this.options.linkDirection);

                    // Update all anchor nodes
                    tr = updateAnchorNodes(tr, tr.doc, this.options.anchorName);

                    // Update all note references
                    tr = updateNoteReferences(tr, tr.doc, this.options.noteName, this.options.anchorName, this.options.linkDirection);

                    // Reorder notes
                    tr = reorderNotes(tr, tr.doc, this.options.notesWrapper, this.options.noteName, this.options.anchorName, this.options.linkDirection);
                    return true;
                },
        };
    },
    addProseMirrorPlugins() {
        const options = this.options;
        return [
            new Plugin({
                key: new PluginKey('footnoteRules'),
                appendTransaction(transactions, oldState, newState) {
                    const isRemoteTransaction = transactions.every((tr) => tr.meta['y-sync$'] !== undefined);
                    if (isRemoteTransaction) {
                        return null;
                    }

                    let newTr = newState.tr;
                    let anchorId = null; // Store the ID of the newly inserted anchor
                    let referencesNeedUpdate = false; // Track if references need to be updated
                    let deletedAnchorIds = new Set(); // Track IDs of deleted anchors

                    // Check for complete document replacement
                    const isCompleteReplacement = transactions.some((tr) => {
                        return tr.steps.some((step) => {
                            if (step instanceof ReplaceStep) {
                                return step.from === 0 && step.to === oldState.doc.content.size;
                            }
                            return false;
                        });
                    });

                    if (isCompleteReplacement) {
                        referencesNeedUpdate = true;
                        // During complete replacement (initial load), don't create new notes
                        // Just update references - existing notes should already be linked
                        anchorId = null;
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
                                        if (node?.type.name == options.anchorName) {
                                            const insertedAnchorId = node.attrs['id'];
                                            // Check if this anchor already has a note linked to it
                                            // This prevents creating duplicate notes during initial load or partial updates
                                            if (insertedAnchorId) {
                                                let hasExistingNote = false;
                                                if (options.linkDirection === 'note-to-anchor') {
                                                    // TEI: check if note with target exists
                                                    newState.doc.descendants((n, p) => {
                                                        if (n.type.name === options.noteName && n.attrs.target === `#${insertedAnchorId}`) {
                                                            hasExistingNote = true;
                                                            return false;
                                                        }
                                                    });
                                                } else {
                                                    // JATS: check if anchor has rid pointing to a note
                                                    const rid = node.attrs.rid || node.attrs.target;
                                                    if (rid) {
                                                        const noteId = rid.startsWith('#') ? rid.substring(1) : rid;
                                                        newState.doc.descendants((n, p) => {
                                                            if (n.type.name === options.noteName && n.attrs.id === noteId) {
                                                                hasExistingNote = true;
                                                                return false;
                                                            }
                                                        });
                                                    }
                                                }
                                                // Only set anchorId if this anchor doesn't already have a note
                                                if (!hasExistingNote) {
                                                    anchorId = insertedAnchorId;
                                                    referencesNeedUpdate = true;
                                                }
                                            }
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
                                    if (node.type.name === options.anchorName) {
                                        oldAnchors.set(node.attrs.id, pos);
                                    }
                                });

                                newDoc.descendants((node, pos) => {
                                    if (node.type.name === options.anchorName) {
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
                                if (
                                    oldAnchors.size !== newAnchors.size ||
                                    Array.from(oldAnchors.entries()).some(([id, pos]) => newAnchors.get(id) !== pos)
                                ) {
                                    referencesNeedUpdate = true;
                                }
                            }
                        }
                    }

                    // Remove notes associated with deleted anchors
                    if (deletedAnchorIds.size > 0) {
                        newState.doc.descendants((node, pos) => {
                            if (node.type.name === options.noteName) {
                                let shouldRemove = false;
                                
                                if (options.linkDirection === 'note-to-anchor') {
                                    // TEI: note.target -> anchor.id
                                    const target = node.attrs.target;
                                    if (target && target.startsWith('#')) {
                                        const anchorId = target.substring(1);
                                        shouldRemove = deletedAnchorIds.has(anchorId);
                                    }
                                } else {
                                    // JATS: anchor.rid -> note.id
                                    const noteId = node.attrs.id;
                                    if (noteId) {
                                        // Check if any deleted anchor points to this note
                                        for (const anchorId of deletedAnchorIds) {
                                            let anchorPos = null;
                                            newState.doc.descendants((n, p) => {
                                                if (n.type.name === options.anchorName && n.attrs.id === anchorId) {
                                                    anchorPos = p;
                                                    return false;
                                                }
                                            });
                                            if (anchorPos !== null) {
                                                const anchor = newState.doc.nodeAt(anchorPos);
                                                if (anchor) {
                                                    const rid = anchor.attrs.rid || anchor.attrs.target;
                                                    if (rid && rid.startsWith('#') && rid.substring(1) === noteId) {
                                                        shouldRemove = true;
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                
                                if (shouldRemove) {
                                    if (!options.notesWithoutAnchor) {
                                        newTr = newTr.delete(pos, pos + node.nodeSize);
                                    } else {
                                        const { target, _reference, rid, ...attrs } = node.attrs;
                                        newTr = newTr.setNodeMarkup(pos, null, {
                                            ...attrs,
                                            _timestamp: Date.now(),
                                        });
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
                                if (node.type.name === options.noteName) {
                                    if (options.linkDirection === 'note-to-anchor') {
                                        if (!node.attrs.target) {
                                            foundNote = true;
                                            return false;
                                        }
                                    } else {
                                        // JATS: check if note has no anchor pointing to it
                                        const noteId = node.attrs.id;
                                        if (noteId) {
                                            const anchor = findAnchorByNote(newState.doc, noteId, options.anchorName, options.linkDirection);
                                            if (!anchor) {
                                                foundNote = true;
                                                return false;
                                            }
                                        }
                                    }
                                }
                            });
                            if (foundNote) {
                                return null;
                            }
                        }
                        
                        // Check if a note linked to this anchor already exists
                        let noteExists = false;
                        if (options.linkDirection === 'note-to-anchor') {
                            // TEI: check if note with target pointing to this anchor exists
                            newState.doc.descendants((node, pos) => {
                                if (node.type.name === options.noteName && node.attrs.target === `#${anchorId}`) {
                                    noteExists = true;
                                    return false;
                                }
                            });
                        } else {
                            // JATS: check if anchor already has rid pointing to a note
                            let anchorNode = null;
                            newState.doc.descendants((node, pos) => {
                                if (node.type.name === options.anchorName && node.attrs.id === anchorId) {
                                    anchorNode = node;
                                    return false;
                                }
                            });
                            if (anchorNode) {
                                const rid = anchorNode.attrs.rid || anchorNode.attrs.target;
                                if (rid) {
                                    // rid may have # prefix or not - handle both cases
                                    const noteId = rid.startsWith('#') ? rid.substring(1) : rid;
                                    newState.doc.descendants((node, pos) => {
                                        if (node.type.name === options.noteName && node.attrs.id === noteId) {
                                            noteExists = true;
                                            return false;
                                        }
                                    });
                                }
                            }
                        }

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

                        // Generate a note ID for JATS (anchor-to-note direction)
                        const noteId = options.linkDirection === 'anchor-to-note' 
                            ? `fn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                            : undefined;
                        
                        // Insert a new note at the end of the listAnnotation with a reference to the anchor
                        const noteAttrs = {
                            _reference: '1', // Will be updated later
                            _timestamp: Date.now(),
                        };
                        
                        if (options.linkDirection === 'note-to-anchor') {
                            // TEI: note.target -> anchor.id
                            noteAttrs.target = `#${anchorId}`;
                        } else {
                            // JATS: note gets an id, anchor.rid will point to it
                            noteAttrs.id = noteId;
                        }
                        
                        const noteNode = newState.schema.nodes[options.noteName].create(
                            noteAttrs,
                            [newState.schema.nodes.p.create({}, [])],
                        );
                        
                        // For JATS, also update the anchor to point to the note
                        if (options.linkDirection === 'anchor-to-note') {
                            newState.doc.descendants((node, pos) => {
                                if (node.type.name === options.anchorName && node.attrs.id === anchorId) {
                                    newTr = newTr.setNodeMarkup(pos, null, {
                                        ...node.attrs,
                                        rid: `#${noteId}`,
                                        'ref-type': 'fn',
                                        _timestamp: Date.now(),
                                    });
                                    return false;
                                }
                            });
                        }
                        const insertPos = listAnnotationPos + listAnnotationNode.nodeSize - 1;

                        // Insert the note and create a paragraph inside it
                        newTr = newTr.insert(insertPos, noteNode);

                        // Get the position after the note was inserted
                        const notePos = insertPos;
                        const note = newTr.doc.nodeAt(notePos);

                        if (note) {
                            // Set the selection to the start of the note
                            newTr = newTr.setSelection(TextSelection.create(newTr.doc, notePos + 1));

                            // Add scroll to the transaction
                            newTr.scrollIntoView();
                        }
                    }

                    // Update references if needed using the final document state
                    if (referencesNeedUpdate) {
                        // Compute references based on the current transaction state
                        computeAnchorReferences(newTr.doc, options.anchorName, options.noteName, options.linkDirection);

                        // Update all anchor nodes
                        newTr = updateAnchorNodes(newTr, newTr.doc, options.anchorName);

                        // Update all note references
                        newTr = updateNoteReferences(newTr, newTr.doc, options.noteName, options.anchorName, options.linkDirection);

                        // Reorder notes
                        const targetNoteId = options.linkDirection === 'anchor-to-note' && anchorId
                            ? (() => {
                                // Find note ID that the anchor points to
                                let noteId = null;
                                newTr.doc.descendants((node, pos) => {
                                    if (node.type.name === options.anchorName && node.attrs.id === anchorId) {
                                        const rid = node.attrs.rid || node.attrs.target;
                                        if (rid && rid.startsWith('#')) {
                                            noteId = rid.substring(1);
                                        }
                                        return false;
                                    }
                                });
                                return noteId;
                            })()
                            : anchorId;
                        newTr = reorderNotes(newTr, newTr.doc, options.notesWrapper, options.noteName, options.anchorName, options.linkDirection, targetNoteId);
                    }

                    return newTr;
                },
            }),
        ];
    },
});

export default FootnoteRules;
