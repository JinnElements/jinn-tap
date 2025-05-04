import { parseXml } from './util';
import { registerXQueryModule, evaluateXPathToNodes, evaluateXPath, evaluateXPathToFirstNode } from "fontoxpath";

registerXQueryModule(`
    xquery version "3.1";

    module namespace jt="http://jinntec.de/jinntap";

    declare namespace tei="http://www.tei-c.org/ns/1.0";

    declare function jt:new-document() {
        <TEI xmlns="http://www.tei-c.org/ns/1.0">
            <teiHeader>
                <fileDesc>
                    <titleStmt>
                        <title>JinnTap Documentation</title>
                    </titleStmt>
                    <publicationStmt>
                        <p>Information about publication or distribution</p>
                    </publicationStmt>
                    <sourceDesc>
                        <p>Information about the source</p>
                    </sourceDesc>
                </fileDesc>
            </teiHeader>
            <text>
                <body>
                    <div>
                        <p></p>
                    </div>
                </body>
            </text>
            <standOff>
                <listAnnotation></listAnnotation>
            </standOff>
        </TEI>
    };

    declare function jt:import($doc as node()) {
        let $xml :=
            if (not($doc//tei:body)) then
                $doc//tei:text/tei:div
            else
                $doc//tei:body
        return (
            jt:import($xml, false()),
            <tei-listAnnotation>
            { 
                jt:import($doc//tei:standOff/tei:listAnnotation/tei:note, true()),
                jt:import($xml//tei:note, true())
            }
            </tei-listAnnotation>
        )
    };

    declare function jt:import($nodes as node()*, $importNotes as xs:boolean) {
        for $node in $nodes
        return
            typeswitch($node)
                case element(tei:listAnnotation) return
                    ()
                case element(tei:note) return
                    if ($importNotes) then
                        <tei-note target="{if ($node/@target) then $node/@target else ('#' || generate-id($node))}" type="note">
                            { jt:import($node/node(), false()) }
                        </tei-note>
                    else
                        <tei-anchor id="{if ($node/@xml:id) then $node/@xml:id else generate-id($node)}"/>
                case element() return
                    element { "tei-" || local-name($node) } {
                        $node/@* except $node/@xml:id,
                        if ($node/@xml:id) then
                            attribute id { $node/@xml:id }
                        else
                            (),
                        jt:import($node/node(), $importNotes)
                    }
                default return
                    $node
    };

    declare function jt:export($nodes as node()*, $input as document-node()) {
        for $node in $nodes
        return
            typeswitch($node)
                case document-node() return
                    jt:export($node/node(), $input)
                case element(tei:TEI) return
                    element { node-name($node) } {
                        $node/@*,
                        $node/tei:teiHeader,
                        jt:export($node/tei:text, $input),
                        if (not($node/tei:standOff)) then
                            <standOff xmlns="http://www.tei-c.org/ns/1.0">{ $input//tei:listAnnotation }</standOff>
                        else
                            (),
                        jt:export($node/tei:standOff, $input)
                    }
                case element(tei:standOff) return
                    element { node-name($node) } {
                        $node/@*,
                        $node/* except $node/tei:listAnnotation,
                        $input//tei:listAnnotation
                    }
                case element(tei:body) return
                    element { node-name($node) } {
                        $node/@*,
                        $input/tei:body/node() except $input/tei:body/tei:listAnnotation
                    }
                case element() return
                    element { node-name($node) } {
                        $node/@*,
                        jt:export($node/node(), $input)
                    }
                default return
                    $node
        };
`);

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
            nodesFactory: document
        }
    );
    const xmlText = [];
    output.forEach(node => {
        xmlText.push(node.outerHTML);
    });
    return {
        content: xmlText.join(''),
        doc: xmlDoc
    };
}

export function exportXml(content, xmlDoc) {
    if (!xmlDoc) return content;
    const nodes = parseXml(`<body xmlns="http://www.tei-c.org/ns/1.0">${content}</body>`);
    const output = evaluateXPathToFirstNode(
        `
            import module namespace jt="http://jinntec.de/jinntap";
            
            jt:export($document, .)
        `,
        nodes,
        null,
        {
            document: xmlDoc
        },
        {
            language: evaluateXPath.XQUERY_3_1_LANGUAGE
        }
    );
    const xml = new XMLSerializer().serializeToString(output);
    return xml;
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
            debug: true
        }
    );
    return importXml(doc);
}