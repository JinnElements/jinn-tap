import { parseXml } from './util';
import { registerXQueryModule, evaluateXPathToNodes, evaluateXPath, evaluateXPathToFirstNode } from 'fontoxpath';
import teiModule from './module-tei.xq?raw';
import jatsModule from './module-jats.xq?raw';
import docbookModule from './module-docbook.xq?raw';
import { getFormat } from './xml-formats.js';

// Register format modules at initialization — each uses a distinct namespace URI
registerXQueryModule(teiModule); // namespace: http://jinntec.de/jinntap
registerXQueryModule(jatsModule); // namespace: http://jinntec.de/jinntap/jats
registerXQueryModule(docbookModule); // namespace: http://jinntec.de/jinntap/docbook

const MODULE_NAMESPACES = {
    tei: { namespace: 'http://jinntec.de/jinntap', prefix: 'jt' },
    jats: { namespace: 'http://jinntec.de/jinntap/jats', prefix: 'jt-jats' },
    docbook: { namespace: 'http://jinntec.de/jinntap/docbook', prefix: 'jt-docbook' },
};

/**
 * Get the module namespace URI and prefix based on format
 * @param {string} formatId - Format identifier ('tei', 'jats', 'docbook', etc.)
 * @returns {{namespace: string, prefix: string}}
 */
function getModuleNamespace(formatId) {
    return MODULE_NAMESPACES[formatId?.toLowerCase()] || MODULE_NAMESPACES.tei;
}

/**
 * Node factory for building editor HTML custom elements.
 * HTML documents reject createCDATASection; map CDATA to text so imports of
 * DocBook/TEI programlistings that use <![CDATA[…]]> still work.
 * @param {Document} [doc=document]
 */
function htmlNodesFactory(doc = document) {
    return {
        createAttributeNS: (ns, name) => doc.createAttributeNS(ns, name),
        createCDATASection: (data) => doc.createTextNode(data),
        createComment: (data) => doc.createComment(data),
        createDocument: () => doc.implementation.createDocument(null, null, null),
        createElementNS: (ns, name) => doc.createElementNS(ns, name),
        createProcessingInstruction: (target, data) => doc.createProcessingInstruction(target, data),
        createTextNode: (data) => doc.createTextNode(data),
    };
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
 * Local element names (no format prefix) whose schema entries set preserveSpace.
 * @param {Object|null|undefined} schemaDef
 * @returns {Set<string>}
 */
function preserveSpaceLocalNames(schemaDef) {
    const names = new Set();
    if (!schemaDef?.schema) return names;
    for (const [name, raw] of Object.entries(schemaDef.schema)) {
        const defs = Array.isArray(raw) ? raw : [raw];
        for (const def of defs) {
            if (def?.preserveSpace) {
                names.add(def.tagName || name);
            }
        }
    }
    return names;
}

/**
 * Strip editor custom-element prefix (tei-/jats-/db-) for schema lookup.
 * @param {Element} el
 * @returns {string}
 */
function unprefixedLocalName(el) {
    return (el.localName || '').replace(/^(tei|jats|db)-/, '');
}

/**
 * Collapse pretty-print whitespace from imported XML so indentation and
 * newlines between tags do not show up as editable text. Significant leading /
 * trailing spaces in mixed content are kept as a single space. Honours
 * `xml:space="preserve"` and schema `preserveSpace` element names.
 *
 * @param {Node} node
 * @param {boolean} [preserve=false]
 * @param {Set<string>|null} [preserveLocals=null]
 */
function normalizeImportWhitespace(node, preserve = false, preserveLocals = null) {
    if (node.nodeType === Node.ELEMENT_NODE) {
        const preserveHere =
            preserve || hasXmlSpacePreserve(node) || Boolean(preserveLocals?.has(unprefixedLocalName(node)));
        // Copy first — we may remove children while iterating.
        for (const child of Array.from(node.childNodes)) {
            normalizeImportWhitespace(child, preserveHere, preserveLocals);
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
 * If the XML string uses xlink:* attributes but never declares xmlns:xlink,
 * inject the declaration on the root element so DOMParser succeeds.
 * Recovers DocBook (and similar) documents saved before the export fix.
 * @param {string} xml
 * @returns {string}
 */
function ensureXlinkNamespace(xml) {
    if (typeof xml !== 'string' || !/\bxlink:/.test(xml) || /xmlns:xlink\s*=/.test(xml)) {
        return xml;
    }
    return xml.replace(/<([A-Za-z_][\w.-]*)(\s[^>]*)?>/, (match, name, attrs = '') => {
        if (/\/\s*$/.test(attrs) || attrs.includes('xmlns:xlink')) {
            return match;
        }
        return `<${name}${attrs} xmlns:xlink="http://www.w3.org/1999/xlink">`;
    });
}

const XLINK_NS = 'http://www.w3.org/1999/xlink';

/**
 * DocBook: keep a single xmlns:xlink on &lt;article&gt;. XMLSerializer often
 * re-declares it on every &lt;link&gt; and then drops the unused root binding.
 * @param {string} xml
 * @returns {string}
 */
function hoistDocbookXlinkNamespace(xml) {
    if (typeof xml !== 'string' || !/<article\b/.test(xml)) {
        return xml;
    }
    const stripped = xml.replace(/\sxmlns:xlink="[^"]*"/g, '');
    return stripped.replace(/<article\b/, `<article xmlns:xlink="${XLINK_NS}"`);
}

/**
 * @param content {string|Node} - The content to transform to the internal XML
 * @param formatId {string} - Format identifier ('tei', 'jats', etc.). Required - format is not auto-detected.
 * @param {Object} [schemaDef] - Editor schema; used so preserveSpace elements keep newlines
 * @returns {{content: string, doc: Node, format: string}}
 */
export function importXml(content, formatId, schemaDef) {
    const xmlDoc =
        typeof content === 'string' ? parseXml(ensureXlinkNamespace(content)) : content;
    if (!xmlDoc) {
        throw new Error('Failed to parse XML for import');
    }

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
            // we want to create HTML, not XML nodes (CDATA → text; see htmlNodesFactory)
            nodesFactory: htmlNodesFactory(),
            moduleImports: {
                jt: moduleNs.namespace,
            },
        },
    );
    const preserveLocals = preserveSpaceLocalNames(schemaDef);
    const xmlText = [];
    output.forEach((node) => {
        normalizeImportWhitespace(node, false, preserveLocals);
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

    // Build body wrapper. Always declare xlink so editor content with xlink:href
    // (DocBook link, JATS ext-link, …) parses as XML before export.
    const nsAttrs = [
        format.namespace && format.namespace !== '' ? `xmlns="${format.namespace}"` : null,
        'xmlns:xlink="http://www.w3.org/1999/xlink"',
    ]
        .filter(Boolean)
        .join(' ');
    const bodyWrapperXml = `<${format.bodyWrapper} ${nsAttrs}>${content}</${format.bodyWrapper}>`;

    const nodes = parseXml(bodyWrapperXml);
    if (!nodes) {
        throw new Error('Failed to parse editor content for export (invalid XML fragment)');
    }
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
    const exported = output.map((node) => serializer.serializeToString(node)).join('');
    return finalFormat === 'docbook' ? hoistDocbookXlinkNamespace(exported) : exported;
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
