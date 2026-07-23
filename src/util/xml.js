import { parseXml } from './util';
import { registerXQueryModule, evaluateXPathToNodes, evaluateXPath, evaluateXPathToFirstNode } from 'fontoxpath';
import teiModule from './module-tei.xq?raw';
import jatsModule from './module-jats.xq?raw';
import { getFormat } from './xml-formats.js';

// Register both modules at initialization - they use different namespace URIs
registerXQueryModule(teiModule); // namespace: http://jinntec.de/jinntap
registerXQueryModule(jatsModule); // namespace: http://jinntec.de/jinntap/jats

/**
 * Get the module namespace URI and prefix based on format
 * @param {string} formatId - Format identifier ('tei', 'jats', etc.)
 * @returns {{namespace: string, prefix: string}}
 */
function getModuleNamespace(formatId) {
    if (formatId === 'jats') {
        return {
            namespace: 'http://jinntec.de/jinntap/jats',
            prefix: 'jt-jats',
        };
    } else {
        // Default to TEI
        return {
            namespace: 'http://jinntec.de/jinntap',
            prefix: 'jt',
        };
    }
}

/**
 * Whether an element (or its nearest ancestor) requests preserved space.
 * Handles both the XML attribute form and the HTML `xml:space` name.
 * @param {Element} el
 * @returns {boolean}
 */
function hasXmlSpacePreserve(el) {
    if (!(el instanceof Element)) return false;
    const value =
        el.getAttribute('xml:space') ||
        el.getAttributeNS?.('http://www.w3.org/XML/1998/namespace', 'space') ||
        el.getAttribute('space');
    return value === 'preserve';
}

/**
 * Collapse pretty-print whitespace from imported XML so indentation and
 * newlines between tags do not show up as editable text. Significant leading /
 * trailing spaces in mixed content are kept as a single space. Honours
 * `xml:space="preserve"`.
 *
 * @param {Node} node
 * @param {boolean} [preserve=false]
 */
function normalizeImportWhitespace(node, preserve = false) {
    if (node.nodeType === Node.ELEMENT_NODE) {
        const preserveHere = preserve || hasXmlSpacePreserve(node);
        // Copy first — we may remove children while iterating.
        for (const child of Array.from(node.childNodes)) {
            normalizeImportWhitespace(child, preserveHere);
        }
        return;
    }
    if (node.nodeType !== Node.TEXT_NODE || preserve) {
        return;
    }
    const raw = node.nodeValue ?? '';
    if (!/\S/.test(raw)) {
        // Insignificant whitespace between elements (pretty-printed XML).
        node.parentNode?.removeChild(node);
        return;
    }
    const leading = /^\s/.test(raw);
    const trailing = /\s$/.test(raw);
    node.nodeValue = `${leading ? ' ' : ''}${raw.trim().replace(/\s+/g, ' ')}${trailing ? ' ' : ''}`;
}

/**
 * @param content {string|Node} - The content to transform to the internal XML
 * @param formatId {string} - Format identifier ('tei', 'jats', etc.). Required - format is not auto-detected.
 * @returns {{content: string, doc: Node, format: string}}
 */
export function importXml(content, formatId) {
    const xmlDoc = typeof content === 'string' ? parseXml(content) : content;
    if (!xmlDoc) return '';

    if (!formatId) {
        throw new Error('formatId is required - format autodetection is disabled');
    }

    // Always use the provided formatId - no autodetection
    const finalFormat = formatId;

    // Get the correct module namespace based on format
    const moduleNs = getModuleNamespace(finalFormat);
    const output = evaluateXPathToNodes(
        `
            jt:import(.)
        `,
        xmlDoc,
        null,
        null,
        {
            language: evaluateXPath.XQUERY_3_1_LANGUAGE,
            // we want to create HTML, not XML nodes
            nodesFactory: document,
            moduleImports: {
                jt: moduleNs.namespace,
            },
        },
    );
    const xmlText = [];
    output.forEach((node) => {
        normalizeImportWhitespace(node);
        xmlText.push(node.outerHTML);
    });
    return {
        content: xmlText.join(''),
        doc: xmlDoc,
        format: finalFormat,
    };
}

/**
 * @param content {string} - The HTML content to export
 * @param xmlDoc {Node} - The original XML document
 * @param metadata {Object} - Metadata to include in export
 * @param formatId {string} - Format identifier ('tei', 'jats', etc.). Required - format is not auto-detected.
 * @returns {string} - Exported XML string
 */
export function exportXml(content, xmlDoc, metadata = {}, formatId) {
    if (!xmlDoc) return content;

    if (!formatId) {
        throw new Error('formatId is required - format autodetection is disabled');
    }

    // Always use the provided formatId - no autodetection
    const finalFormat = formatId;
    const format = getFormat(finalFormat);

    // Get the correct module namespace based on format
    const moduleNs = getModuleNamespace(finalFormat);

    // Build body wrapper with or without namespace
    const bodyWrapperXml =
        format.namespace && format.namespace !== ''
            ? `<${format.bodyWrapper} xmlns="${format.namespace}">${content}</${format.bodyWrapper}>`
            : `<${format.bodyWrapper} xmlns:xlink="http://www.w3.org/1999/xlink">${content}</${format.bodyWrapper}>`;

    const nodes = parseXml(bodyWrapperXml);
    const output = evaluateXPathToNodes(
        `
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
            moduleImports: {
                jt: moduleNs.namespace,
            },
        },
    );
    const serializer = new XMLSerializer();
    return output.map((node) => serializer.serializeToString(node)).join('');
}

/**
 * @param formatId {string} - Format identifier ('tei', 'jats', etc.). Defaults to 'tei'.
 * @returns {{content: string, doc: Node, format: string}}
 */
export function createDocument(formatId = 'tei') {
    const format = getFormat(formatId);

    // Get the correct module namespace based on format
    const moduleNs = getModuleNamespace(formatId);

    // to be used as nodesFactory, which should produce XML nodes
    const template = format.newDocumentTemplate();
    const inDoc = new DOMParser().parseFromString(template, 'application/xml');

    const doc = evaluateXPathToFirstNode(
        `
            jt:new-document()
        `,
        null,
        null,
        null,
        {
            language: evaluateXPath.XQUERY_3_1_LANGUAGE,
            nodesFactory: inDoc,
            debug: true,
            moduleImports: {
                jt: moduleNs.namespace,
            },
        },
    );
    return importXml(doc, formatId);
}
