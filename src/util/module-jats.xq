xquery version '3.1';

module namespace jt = 'http://jinntec.de/jinntap/jats';

declare namespace tei = 'http://www.tei-c.org/ns/1.0';

declare function jt:new-document () {
    <article article-type="research-article">
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
    </article>
};

declare function jt:import ($doc as node()) {
    let $xml := $doc//body/node()
    return (
            jt:import($xml, false()),
            <jats-fnGroup>
                { jt:import($doc//back/fn-group/fn, true()), jt:import($doc//body//fn, true()) }
            </jats-fnGroup>
        )
};

declare %private function jt:transform-to-same-node ($node as node(), $importNotes as xs:boolean) as node()* {
    element {'jats-' || local-name($node)} {
        $node/@*,
        jt:import($node/node(), $importNotes)
    }
};

declare function jt:import ($nodes as node()*, $importNotes as xs:boolean) {
    for $node in $nodes
    return typeswitch ($node)
            case element(body) return
                (: Skip body element, just process its children :)
                jt:import($node/node(), $importNotes)
            case element(fn-group) return
                ()
            case element(fn) return
                if ($importNotes) then
                    (: JATS fn element: note has id, anchor.rid points to it :)
                    <jats-fn
                        n="{$node/@n}"
                        id="{
                            if ($node/@id) then
                                $node/@id
                            else
                                'fn-' || generate-id($node)
                        }"
                        type="note"
                    >{ jt:import($node/node(), false()) }</jats-fn>
                else
                    (: This shouldn't happen for fn elements when not importing notes :)
                    <jats-xref
                        id="{
                            if ($node/@id) then
                                $node/@id
                            else
                                generate-id($node)
                        }" />
            case element(xref) return
                if ($node/@ref-type = 'fn') then
                    (: JATS xref with ref-type="fn": anchor has rid pointing to fn.id :)
                    <jats-xref
                        id="{
                            if ($node/@id) then
                                $node/@id
                            else
                                'xref-' || generate-id($node)
                        }"
                        rid="{$node/@rid}"
                        ref-type="fn"
                    />
                else
                    jt:transform-to-same-node($node, $importNotes)
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
            case element(article) return
                element {node-name($node)} {
                    $node/@*,
                    jt:export($node/front, $input, $meta),
                    jt:export($node/body, $input, $meta),
                    jt:export($node/back, $input, $meta)
                }
            case element(back) return
                element {node-name($node)} {
                    $node/@*, $node/* except $node/fn-group, 
                    (: Export fn-group from input (jats-fnGroup in editor HTML) :)
                    if ($input//jats-fnGroup) then
                        element fn-group {
                            jt:export($input//jats-fnGroup/node(), $input, $meta)
                        }
                    else if ($input//fn-group) then
                        $input//fn-group
                    else
                        ()
                }
            case element(body) return
                element {node-name($node)} {
                    $node/@*,
                    let $contents := $input/body/node() except $input/body/fn-group
                    return jt:export($contents, $input, $meta)
                }
            case element(article-title) return
                element {node-name($node)} {
                    $node/@*,
                    if ($node/ancestor::title-group and map:contains($meta, 'title')) then
                        $meta?title
                    else
                        jt:export($node/node(), $input, $meta)
                }
            case element(jats-xref) return
                (: Convert jats-xref back to xref with ref-type="fn" :)
                element xref {
                    $node/@* except ($node/@id, $node/@ref-type),
                    attribute ref-type { 
                        if ($node/@ref-type) then $node/@ref-type else 'fn' 
                    },
                    (: rid should already be set from the node attributes :)
                    if ($node/@rid) then
                        attribute rid { $node/@rid }
                    else if ($node/@id) then
                        (: If no rid but has id, this shouldn't happen in proper JATS :)
                        ()
                    else (),
                    jt:export($node/node(), $input, $meta)
                }
            case element(jats-fnGroup) return
                (: Convert jats-fnGroup back to fn-group :)
                element fn-group {
                    jt:export($node/node(), $input, $meta)
                }
            case element(jats-fn) return
                (: Convert jats-fn back to fn :)
                element fn {
                    $node/@* except ($node/@target, $node/@type),
                    (: JATS fn has id attribute (not xml:id) :)
                    if ($node/@id) then
                        attribute id { $node/@id }
                    else (),
                    jt:export($node/node(), $input, $meta)
                }
            case element() return
                element {node-name($node)} { $node/@*, jt:export($node/node(), $input, $meta) }

            default return
                $node
};
