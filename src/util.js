import { getMarkRange } from '@tiptap/core';

export function marksInSelection(editor) {
    const { from, to } = editor.state.selection;
    return marksInRange(editor, from, to);
}

export function marksInRange(editor, from, to) {
    // Check for marks across the entire selection
    // We only want to return the marks which are attached to every node in the selection
    let matchingMarks = null;
    editor.state.doc.nodesBetween(from, to, (node, pos, parent, index) => {
        if (node.isText) {
            if (matchingMarks == null) {
                matchingMarks = node.marks.map(mark => ({ mark, pos }));
            } else {
                matchingMarks = matchingMarks.filter(mark => node.marks.find(m => m.type.name === mark.mark.type.name));
            }
        }
    });

    if (matchingMarks) {
        matchingMarks = matchingMarks.map(mark => {
            const $pos = editor.state.doc.resolve(mark.pos);
            const range = getMarkRange($pos, mark.mark.type, mark.mark.attrs);
            mark.text = editor.state.doc.textBetween(range.from, range.to, '', ' ');
            return mark;
        });
        matchingMarks.sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0));
    }
    return matchingMarks;
}

export function parseXml(xml) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'application/xml');

    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
        console.error('XML Parsing Error:', parserError.textContent);
        return null;
    }

    return xmlDoc;
}

export function fromTei(xmlDoc) {
    if (!xmlDoc) return '';
    
    const xmlText = [];
    const nodes = xmlDoc.querySelectorAll('text > body > *');
    
    // Transform node names to tei- prefixed format
    const transformNode = (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            // Create new element with tei- prefix
            const newElement = document.createElement(`tei-${node.tagName}`);

            // Copy all attributes
            for (const attr of node.attributes) {
                if (attr.name === 'xml:id') {
                    newElement.setAttribute('id', attr.value);
                } else { 
                    newElement.setAttribute(attr.name, attr.value);
                }
            }

            // Transform child nodes recursively
            for (const child of node.childNodes) {
                newElement.appendChild(transformNode(child));
            }

            return newElement;
        } else {
            // For text nodes, just clone them
            return node.cloneNode();
        }
    };

    nodes.forEach(content => {
        const transformedContent = transformNode(content);
        console.log(transformedContent.outerHTML);
        xmlText.push(transformedContent.outerHTML);
    });
    
    return xmlText.join('');
}

export function fromXml(content) {
    const xmlDoc = parseXml(content);
            
    // Check if root element is in TEI namespace
    const hasTeiNamespace = xmlDoc.documentElement.namespaceURI === 'http://www.tei-c.org/ns/1.0';
    return hasTeiNamespace ? fromTei(xmlDoc) : xml;
}