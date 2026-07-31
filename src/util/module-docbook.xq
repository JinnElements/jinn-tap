xquery version '3.1';

module namespace jt = 'http://jinntec.de/jinntap/docbook';

declare namespace db = 'http://docbook.org/ns/docbook';
declare namespace xlink = 'http://www.w3.org/1999/xlink';

declare function jt:new-document () {
    <article xmlns="http://docbook.org/ns/docbook"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        version="5.0">
        <info>
            <title>Untitled</title>
        </info>
        <section>
            <title>Section</title>
            <para />
        </section>
    </article>
};

(: Copy attributes, mapping xml:id → id for the editor. :)
declare %private function jt:import-attrs ($node as element()) as attribute()* {
    $node/@* except ($node/@xml:id, $node/@id),
    if ($node/@xml:id) then
        attribute id { $node/@xml:id }
    else if ($node/@id) then
        attribute id { $node/@id }
    else (
    ),
    if (namespace-uri($node) != '' and namespace-uri($node) != 'http://docbook.org/ns/docbook') then
        attribute {'_xmlns'} { namespace-uri($node) }
    else (
    )
};

declare function jt:import ($doc as node()) {
    let $article :=
        if ($doc instance of document-node()) then
            $doc/(db:article | article)
        else if (local-name($doc) = 'article') then
            $doc
        else
            $doc/(db:article | article)
    return
        jt:import-nodes($article/(* except (db:info | info)))
};

declare %private function jt:transform-to-same-node ($node as element()) as element() {
    element {'db-' || local-name($node)} {
        jt:import-attrs($node),
        jt:import-nodes($node/node())
    }
};

(: Flatten figure/mediaobject/imageobject/imagedata → figure with title + imagedata. :)
declare %private function jt:import-figure ($node as element()) as element() {
    <db-figure>
        { jt:import-attrs($node) }
        { jt:import-nodes($node/(db:title | title)) }
        {
            for $img in $node//(db:imagedata | imagedata)
            return
                <db-imagedata>
                    { jt:import-attrs($img) }
                </db-imagedata>
        }
    </db-figure>
};

(: Map informaltable (HTML-style) → table/row/cell; drop thead/tbody wrappers. :)
declare %private function jt:import-informaltable ($node as element()) as element() {
    <db-table>
        { jt:import-attrs($node) }
        {
            for $tr in $node//(db:tr | tr)
            return
                <db-row>
                    { jt:import-attrs($tr) }
                    {
                        for $td in $tr/(db:td | td | db:th | th)
                        return
                            <db-cell>
                                { jt:import-attrs($td) }
                                { jt:import-nodes($td/node()) }
                            </db-cell>
                    }
                </db-row>
        }
    </db-table>
};

declare %private function jt:import-nodes ($nodes as node()*) {
    for $node in $nodes
    return typeswitch ($node)
            case element(db:info) | element(info) return
                ()
            case element(db:figure) | element(figure) return
                jt:import-figure($node)
            case element(db:mediaobject) | element(mediaobject)
            | element(db:imageobject) | element(imageobject) return
                ()
            case element(db:informaltable) | element(informaltable) return
                jt:import-informaltable($node)
            case element(db:thead) | element(thead)
            | element(db:tbody) | element(tbody) return
                ()
            case element() return
                jt:transform-to-same-node($node)
            default return
                $node
};

(: Pass through attributes for export; drop editor-only ones. :)
declare %private function jt:export-attrs ($node as element()) as attribute()* {
    $node/@* except ($node/@_xmlns, $node/@_reference, $node/@type, $node/@colspan, $node/@rowspan, $node/@cols, $node/@rows)
};

declare %private function jt:db-element ($name as xs:string, $node as element(), $input as document-node(), $meta as map(*)) as element() {
    element {QName('http://docbook.org/ns/docbook', $name)} {
        jt:export-attrs($node),
        jt:export($node/node(), $input, $meta)
    }
};

(: Rebuild figure → title + mediaobject/imageobject/imagedata. :)
declare %private function jt:export-figure ($node as element(), $input as document-node(), $meta as map(*)) as element() {
    element {QName('http://docbook.org/ns/docbook', 'figure')} {
        jt:export-attrs($node),
        for $child in $node/node()
        return
            if (local-name($child) = 'title') then
                jt:db-element('title', $child, $input, $meta)
            else if (local-name($child) = 'imagedata') then
                element {QName('http://docbook.org/ns/docbook', 'mediaobject')} {
                    element {QName('http://docbook.org/ns/docbook', 'imageobject')} {
                        element {QName('http://docbook.org/ns/docbook', 'imagedata')} {
                            jt:export-attrs($child)
                        }
                    }
                }
            else
                jt:export($child, $input, $meta)
    }
};

(: Rebuild table/row/cell → informaltable/tbody/tr/td. :)
declare %private function jt:export-table ($node as element(), $input as document-node(), $meta as map(*)) as element() {
    element {QName('http://docbook.org/ns/docbook', 'informaltable')} {
        jt:export-attrs($node),
        element {QName('http://docbook.org/ns/docbook', 'tbody')} {
            for $row in $node/*
            where local-name($row) = 'row'
            return
                element {QName('http://docbook.org/ns/docbook', 'tr')} {
                    jt:export-attrs($row),
                    for $cell in $row/*
                    where local-name($cell) = 'cell'
                    return
                        element {QName('http://docbook.org/ns/docbook', 'td')} {
                            jt:export-attrs($cell),
                            jt:export($cell/node(), $input, $meta)
                        }
                }
        }
    }
};

(:
  jt:export($nodes, $input, $meta)
  $nodes  — original document (walked)
  $input  — editor fragment wrapped in <article xmlns="…">
:)
declare function jt:export ($nodes as node()*, $input as document-node(), $meta as map(*)) {
    for $node in $nodes
    return typeswitch ($node)
            case document-node() return
                jt:export($node/node(), $input, $meta)
            case element(db:article) | element(article) return
                (: Literal constructor so xmlns:xlink is present for link/@xlink:href. :)
                <article xmlns="http://docbook.org/ns/docbook" xmlns:xlink="http://www.w3.org/1999/xlink">
                    { $node/@* }
                    {
                        if (empty($node/@version)) then
                            attribute version { '5.0' }
                        else (
                        )
                    }
                    { $node/(db:info | info) }
                    {
                        let $editor := ($input/(db:article | article), $input/*[1])[1]
                        let $body := $editor/(* except (db:info | info))
                        return
                            jt:export($body, $input, $meta)
                    }
                </article>
            case element(db:info) | element(info) return
                (: Only reached if info appears in editor fragment — skip. :)
                ()
            case element(db:figure) | element(figure) return
                jt:export-figure($node, $input, $meta)
            case element(db:table) | element(table) return
                jt:export-table($node, $input, $meta)
            case element(db:imagedata) | element(imagedata) return
                element {QName('http://docbook.org/ns/docbook', 'imagedata')} {
                    jt:export-attrs($node)
                }
            case element() return
                (: Re-emit in DocBook NS under the element's local name. :)
                jt:db-element(local-name($node), $node, $input, $meta)
            default return
                $node
};
