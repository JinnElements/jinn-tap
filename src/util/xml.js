import { parseXml } from './util';
import { registerXQueryModule, evaluateXPathToNodes, evaluateXPath, evaluateXPathToFirstNode } from 'fontoxpath';
import xqueryModule from './module.xq?raw';

registerXQueryModule(xqueryModule);

/**
 * @param content {string|Node} - The content to transform to the internal XML
 * @returns {{content: string, doc: Node}}
 */
export function importXml(content) {
    const xmlDoc = typeof content === 'string' ? parseXml(content) : content;
    if (!xmlDoc) return '';
    const output = evaluateXPathToNodes(
        `
            import module namespace jt="http://jinntec.de/jinntap";

            jt:import(.)
        `,
        xmlDoc,
        null,
        null,
        {
            language: evaluateXPath.XQUERY_3_1_LANGUAGE,
            // we want to create HTML, not XML nodes
            nodesFactory: document,
        },
    );
    const xmlText = [];
    output.forEach((node) => {
        xmlText.push(node.outerHTML);
    });
    return {
        content: xmlText.join(''),
        doc: xmlDoc,
    };
}

export function exportXml(content, xmlDoc, metadata = {}) {
    if (!xmlDoc) return content;
    const nodes = parseXml(`<body xmlns="http://www.tei-c.org/ns/1.0">${content}</body>`);
    const output = evaluateXPathToNodes(
        `
            import module namespace jt="http://jinntec.de/jinntap";

            jt:export($document, ., $meta)
        `,
        nodes,
        null,
        {
            document: xmlDoc,
            meta: metadata,
        },
        {
            language: evaluateXPath.XQUERY_3_1_LANGUAGE,
        },
    );
    const serializer = new XMLSerializer();
    return output.map((node) => serializer.serializeToString(node)).join('');
}

export function createDocument() {
    // to be used as nodesFactory, which should produce XML nodes
    const inDoc = new DOMParser().parseFromString('<TEI xmlns="http://www.tei-c.org/ns/1.0"></TEI>', 'application/xml');
    const doc = evaluateXPathToFirstNode(
        `
            import module namespace jt="http://jinntec.de/jinntap";

            jt:new-document()
        `,
        null,
        null,
        null,
        {
            language: evaluateXPath.XQUERY_3_1_LANGUAGE,
            nodesFactory: inDoc,
            debug: true,
        },
    );
    return importXml(doc);
}
