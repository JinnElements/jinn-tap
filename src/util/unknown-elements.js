/**
 * Detect prefixed XML elements in the imported content that have no matching
 * entry in the schema definition, and synthesize generic default entries for
 * them. This lets jinntap preserve (and keep editable) markup that the schema
 * doesn't describe, instead of silently dropping it and raising a hard content
 * error.
 *
 * The kind of each unknown element is inferred from how it is actually used in
 * the document:
 *   - empty     -> never has children                     -> type 'empty'  (void)
 *   - container -> contains block-level children           -> type 'block'  (block content)
 *   - textblock -> block-level, only inline/text children  -> type 'block'  (inline content)
 *   - inline    -> sits inside inline/text content         -> type 'inline' (mark)
 *
 * Because container-ness depends on an element's children and block/inline
 * position depends on its parent — both of which may themselves be unknown —
 * classification runs to a fixpoint.
 */

const BLOCK_TYPES = new Set(['block', 'list', 'listItem', 'table', 'row', 'cell', 'graphic']);
const SKIP_ATTRS = new Set(['class', 'style', 'contenteditable', 'draggable']);

/**
 * @param {string} html       - Imported content as prefixed HTML (e.g. `<tei-div>…`)
 * @param {Object} schemaDef  - The active schema definition
 * @param {string} prefix     - Custom-element prefix (e.g. `'tei-'`)
 * @param {Node}   [sourceDoc]- Original XML document, used to recover the
 *                               original-case element name for XML output
 * @returns {{ schema: Object, added: Array<{name: string, kind: string, tag: string}> }}
 *          `schema` is the original definition when nothing was added, otherwise
 *          a shallow clone with the synthesized entries merged in.
 */
export function synthesizeUnknownEntries(html, schemaDef, prefix = 'tei-', sourceDoc = null) {
    const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');
    const root = doc.body;

    const strip = (localName) => localName.slice(prefix.length);
    const isPrefixed = (el) => el.localName.startsWith(prefix);

    // Schema keys may be camelCase while HTML local-names are lowercased, so
    // resolve known entries case-insensitively. Array entries are conditional
    // variants of the same element; their base def is enough here.
    const lowerKeyIndex = new Map();
    Object.keys(schemaDef.schema).forEach((k) => lowerKeyIndex.set(k.toLowerCase(), k));
    const knownEntry = (name) => {
        const key = lowerKeyIndex.get(name);
        if (!key) return null;
        const entry = schemaDef.schema[key];
        return Array.isArray(entry) ? entry[0] : entry;
    };

    // Group every unknown prefixed element by its (lowercased) local name.
    const instances = new Map(); // name -> Element[]
    root.querySelectorAll('*').forEach((el) => {
        if (!isPrefixed(el)) return;
        const name = strip(el.localName);
        if (knownEntry(name)) return;
        if (!instances.has(name)) instances.set(name, []);
        instances.get(name).push(el);
    });

    if (instances.size === 0) {
        return { schema: schemaDef, added: [] };
    }

    const caseMap = buildCaseMap(sourceDoc);
    const classification = new Map(); // name -> 'empty' | 'container' | 'textblock' | 'inline'
    for (const name of instances.keys()) classification.set(name, 'inline');

    const childName = (el) => (isPrefixed(el) ? strip(el.localName) : el.localName);

    // Does a node render as a block node (container or textblock)?
    const isBlock = (name) => {
        const def = knownEntry(name);
        if (def) return BLOCK_TYPES.has(def.type);
        const c = classification.get(name);
        return c === 'container' || c === 'textblock';
    };

    // Does an element hold block-level children (vs. inline/text or nothing)?
    const holdsBlocks = (el) => {
        if (!el || el === root) return true; // body-level position holds blocks
        const def = knownEntry(childName(el));
        if (def) {
            if (!BLOCK_TYPES.has(def.type)) return false; // inline / ref / anchor / empty
            return !!def.content && def.content !== 'inline*';
        }
        return classification.get(childName(el)) === 'container';
    };

    const isEmpty = (el) => el.children.length === 0 && el.textContent.trim() === '';

    for (let pass = 0; pass < 10; pass++) {
        let changed = false;
        for (const [name, els] of instances) {
            let kind;
            if (els.every(isEmpty)) {
                kind = 'empty';
            } else if (els.some((el) => Array.from(el.children).some((c) => isBlock(childName(c))))) {
                kind = 'container';
            } else if (els.every((el) => !holdsBlocks(el.parentElement))) {
                kind = 'inline';
            } else {
                kind = 'textblock';
            }
            if (classification.get(name) !== kind) {
                classification.set(name, kind);
                changed = true;
            }
        }
        if (!changed) break;
    }

    const synthesized = {};
    const added = [];
    for (const [name, els] of instances) {
        const kind = classification.get(name);
        const tag = caseMap.get(name) || name; // original-case name for XML output
        const entry = { unknown: true, attributes: collectAttributes(els) };
        if (tag !== name) entry.tagName = tag;
        switch (kind) {
            case 'empty':
                entry.type = 'empty';
                entry.label = `<${tag}/>`;
                break;
            case 'container':
                entry.type = 'block';
                entry.content = '(block | heading)*';
                break;
            case 'textblock':
                entry.type = 'block'; // undefined content -> base 'inline*'
                break;
            default:
                entry.type = 'inline';
                break;
        }
        synthesized[name] = entry;
        added.push({ name, kind, tag });
    }

    return {
        schema: { ...schemaDef, schema: { ...schemaDef.schema, ...synthesized } },
        added,
    };
}

function collectAttributes(els) {
    const attrs = {};
    els.forEach((el) => {
        for (const { name } of Array.from(el.attributes)) {
            if (SKIP_ATTRS.has(name) || name.startsWith('data-')) continue;
            if (!attrs[name]) attrs[name] = { type: 'string' };
        }
    });
    return attrs;
}

// Recover original-case element names from the source XML (where local-name is
// case-preserving, unlike the lowercased HTML custom elements).
function buildCaseMap(sourceDoc) {
    const map = new Map();
    if (!sourceDoc) return map;
    const root = sourceDoc.documentElement || sourceDoc;
    root.querySelectorAll?.('*').forEach((node) => {
        const lower = node.localName.toLowerCase();
        if (!map.has(lower)) map.set(lower, node.localName);
    });
    return map;
}
