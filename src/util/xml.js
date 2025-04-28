import { parseXml } from './util';

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