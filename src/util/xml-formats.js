/**
 * XML Format Configuration
 * 
 * Defines configuration for different XML formats (TEI, JATS, etc.)
 * Each format specifies:
 * - namespace: The XML namespace URI
 * - rootElement: The root element name
 * - bodyWrapper: Element name to wrap body content in export
 * - prefix: Prefix used for HTML custom elements (e.g., 'tei-' for TEI)
 * - newDocumentTemplate: Function that returns a new document structure
 */

/**
 * @typedef {Object} XmlFormat
 * @property {string} namespace - XML namespace URI
 * @property {string} rootElement - Root element name (e.g., 'TEI', 'article')
 * @property {string} bodyWrapper - Element name to wrap body content in export
 * @property {string} prefix - Prefix for HTML custom elements (e.g., 'tei-', 'jats-')
 * @property {string} notesWrapper - Element name to use as wrapper for notes (e.g., 'listAnnotation')
 * @property {string} noteName - Node name for note elements (e.g., 'note', 'fn')
 * @property {string} anchorName - Node name for anchor elements (e.g., 'anchor', 'xref')
 * @property {string} linkDirection - Direction of link: 'note-to-anchor' (TEI: note.target -> anchor.id) or 'anchor-to-note' (JATS: anchor.rid -> note.id)
 * @property {Function} newDocumentTemplate - Function that returns XML string for new document
 */

/**
 * TEI Format Configuration
 */
export const TEI_FORMAT = {
    namespace: 'http://www.tei-c.org/ns/1.0',
    rootElement: 'TEI',
    bodyWrapper: 'body',
    prefix: 'tei-',
    notesWrapper: 'listAnnotation',
    noteName: 'note',
    anchorName: 'anchor',
    linkDirection: 'note-to-anchor', // note.target points to anchor.id
    newDocumentTemplate: () => `<TEI xmlns="http://www.tei-c.org/ns/1.0">
        <teiHeader>
            <fileDesc>
                <titleStmt><title>Untitled Document</title></titleStmt>
                <publicationStmt><p>Information about publication or distribution</p></publicationStmt>
                <sourceDesc><p>Information about the source</p></sourceDesc>
            </fileDesc>
        </teiHeader>
        <text><body><div><p /></div></body></text>
        <standOff><listAnnotation /></standOff>
    </TEI>`,
};

/**
 * JATS Format Configuration
 * JATS (Journal Article Tag Suite) - commonly used for scholarly articles
 * Note: JATS documents are typically in no namespace (empty namespace)
 */
export const JATS_FORMAT = {
    namespace: '', // JATS is in no namespace
    rootElement: 'article',
    bodyWrapper: 'body',
    prefix: 'jats-',
    notesWrapper: 'fnGroup',
    noteName: 'fn',
    anchorName: 'xref',
    linkDirection: 'anchor-to-note', // anchor.rid points to note.id
    newDocumentTemplate: () => `<article article-type="research-article">
        <front>
            <article-meta>
                <title-group>
                    <article-title>Untitled Article</article-title>
                </title-group>
            </article-meta>
        </front>
        <body>
            <sec>
                <p />
            </sec>
        </body>
        <back>
            <fn-group />
        </back>
    </article>`,
};

/**
 * Format registry - maps format identifiers to format configurations
 */
export const FORMATS = {
    tei: TEI_FORMAT,
    jats: JATS_FORMAT,
};

/**
 * Get format configuration by identifier
 * @param {string} formatId - Format identifier ('tei', 'jats', etc.)
 * @returns {XmlFormat} Format configuration
 */
export function getFormat(formatId = 'tei') {
    const format = FORMATS[formatId.toLowerCase()];
    if (!format) {
        console.warn(`Unknown format "${formatId}", defaulting to TEI`);
        return TEI_FORMAT;
    }
    return format;
}

