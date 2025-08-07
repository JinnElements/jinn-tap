xquery version '3.1';

module namespace jt = 'http://jinntec.de/jinntap';

declare namespace tei = 'http://www.tei-c.org/ns/1.0';

declare function jt:new-document () {
    <TEI xmlns="http://www.tei-c.org/ns/1.0">
        <teiHeader>
            <fileDesc>
                <titleStmt><title>Untitled Document</title></titleStmt>
                <publicationStmt><p>Information about publication or distribution</p></publicationStmt>
                <sourceDesc><p>Information about the source</p></sourceDesc>
            </fileDesc>
        </teiHeader>
        <text><body><div><p /></div></body></text>
        <standOff><listAnnotation /></standOff>
    </TEI>
};

declare function jt:import ($doc as node()) {
    let $xml := if (not($doc//tei:body)) then
        $doc//tei:text/node()
    else
        $doc//tei:body/node()
    return (
            jt:import($xml, false()),
            <tei-listAnnotation>
                { jt:import($doc//tei:standOff/tei:listAnnotation/tei:note, true()), jt:import($xml//tei:note, true()) }
            </tei-listAnnotation>
        )
};

declare %private function jt:transform-to-same-node ($node as node(), $importNotes as xs:boolean) as node()* {
    element {'tei-' || local-name($node)} {
        $node/@* except $node/@xml:id,
        if ($node/@xml:id) then
            attribute id { $node/@xml:id }
        else (
        ),
        jt:import($node/node(), $importNotes)
    }
};

declare function jt:import ($nodes as node()*, $importNotes as xs:boolean) {
    for $node in $nodes
    return typeswitch ($node)
            case element(tei:listAnnotation) return
                ()
            case element(tei:note) return
                if ($importNotes) then
                    <tei-note
                        target="{
                            if ($node/@target) then
                                $node/@target
                            else (
                                '#' || generate-id($node)
                            )
                        }"
                        type="note"
                    >{ jt:import($node/node(), false()) }</tei-note>
                else
                    <tei-anchor
                        id="{
                            if ($node/@xml:id) then
                                $node/@xml:id
                            else
                                generate-id($node)
                        }" />
            case element(tei:row) return
                (: If there is a pb element directly after the row, fold it into the row as an attribute :)
                let $preceding-pb := $node/preceding-sibling::*[1][self::tei:pb]
                return if (empty($preceding-pb)) then (
                        jt:transform-to-same-node($node, $importNotes)
                    ) else (
                        <tei-row>
                            { $node/@*, attribute data-preceding-pb { true() }, jt:import($node/node(), $importNotes) }
                        </tei-row>
                    )
            case element(tei:pb) return
                if ($node/parent::tei:table) then (
                    (: Remove the pb element, it's folded into the row :)
                ) else (
                    jt:transform-to-same-node($node, $importNotes)
                )
            case element() return
                jt:transform-to-same-node($node, $importNotes)

            default return
                $node
};

declare function jt:export ($nodes as node()*, $input as document-node(), $meta as map(*)) {
    for $node in $nodes
    return typeswitch ($node)
            case document-node() return
                jt:export($node/node(), $input, $meta)
            case element(tei:TEI) return
                element {node-name($node)} {
                    $node/@*,
                    jt:export($node/tei:teiHeader, $input, $meta),
                    jt:export($node/tei:text, $input, $meta),
                    if (not($node/tei:standOff)) then
                        <standOff xmlns="http://www.tei-c.org/ns/1.0">{ $input//tei:listAnnotation }</standOff>
                    else (
                    ),
                    jt:export($node/tei:standOff, $input, $meta)
                }
            case element(tei:standOff) return
                element {node-name($node)} {
                    $node/@*, $node/* except $node/tei:listAnnotation, $input//tei:listAnnotation
                }
            case element(tei:body) return
                element {node-name($node)} {
                    $node/@*,
                    let $contents := $input/tei:body/node() except $input/tei:body/tei:listAnnotation
                    return jt:export($contents, $input, $meta)
                }
            case element(tei:title) return
                element {node-name($node)} {
                    $node/@*,
                    if ($node/ancestor::tei:titleStmt and map:contains($meta, 'title')) then
                        $meta?title
                    else
                        jt:export($node/node(), $input, $meta)
                }
            case element(tei:cell) return
                element {node-name($node)} {
                    (: Filter out rowspan and colspan. They are added while the TEI table is an HTML table :)
                    $node/@* except $node/(@colspan, @rowspan), jt:export($node/node(), $input, $meta)
                }
            case element(tei:row) return
                (
                    if ($node/@data-preceding-pb) then (
                        (: Add the pb element in again. TODO: attributes :)
                        <tei:pb />
                    ) else (
                    ),
                    <tei:row>
                        { $node/@* except $node/@data-preceding-pb, jt:export($node/node(), $input, $meta) }
                    </tei:row>
                )
            case element() return
                element {node-name($node)} { $node/@*, jt:export($node/node(), $input, $meta) }

            default return
                $node
};
