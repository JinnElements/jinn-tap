/**
 * Detect schema violations in imported HTML *before* ProseMirror rewrites the
 * tree. TipTap's enableContentCheck only catches unknown tags; known tags in an
 * invalid place are lifted, wrapped, or dropped silently — users still need a
 * warning that the authored structure did not match the schema.
 */

/**
 * Map an HTML local name (after prefix strip) to a schema / ProseMirror type name.
 * @param {string} localName
 * @param {Object} schemaDef
 * @returns {string|null}
 */
function htmlLocalToTypeName(localName, schemaDef) {
    if (!schemaDef?.schema) return null;
    if (schemaDef.schema[localName] !== undefined) {
        return localName;
    }
    for (const [name, rawDef] of Object.entries(schemaDef.schema)) {
        const def = Array.isArray(rawDef) ? rawDef[0] : rawDef;
        if (def?.tagName === localName) {
            return name;
        }
    }
    return null;
}

/**
 * @typedef {Object} SchemaViolation
 * @property {string} parent - Parent node type name
 * @property {string} child - Child node type that is not allowed there
 */

/**
 * Walk prefixed HTML and report element children that do not fit the parent's
 * ProseMirror content expression (via ContentMatch.matchType).
 *
 * @param {string} html
 * @param {import('@tiptap/pm/model').Schema} pmSchema
 * @param {Object} schemaDef
 * @param {string} prefix
 * @returns {SchemaViolation[]}
 */
export function findSchemaViolations(html, pmSchema, schemaDef, prefix) {
    const violations = [];
    if (!html || typeof html !== 'string' || !pmSchema) {
        return violations;
    }

    const template = document.createElement('template');
    template.innerHTML = html;

    const typeOf = (el) => {
        const tag = el.localName || '';
        if (!tag.startsWith(prefix)) {
            return null;
        }
        return htmlLocalToTypeName(tag.slice(prefix.length), schemaDef);
    };

    const walk = (el) => {
        const parentName = typeOf(el);
        const parentType = parentName ? pmSchema.nodes[parentName] : null;

        if (parentType && !parentType.isLeaf && parentType.contentMatch) {
            let match = parentType.contentMatch;
            for (const child of el.children) {
                const childName = typeOf(child);
                if (!childName) {
                    continue;
                }
                // Marks are not node children in the PM model; skip them here.
                if (pmSchema.marks[childName] && !pmSchema.nodes[childName]) {
                    continue;
                }
                const childType = pmSchema.nodes[childName];
                if (!childType) {
                    continue;
                }
                const next = match.matchType(childType);
                if (!next) {
                    violations.push({ parent: parentName, child: childName });
                    // Keep scanning siblings against the same match position so
                    // multiple illegal children are all reported.
                } else {
                    match = next;
                }
            }
        }

        for (const child of el.children) {
            walk(child);
        }
    };

    for (const child of template.content.children) {
        walk(child);
    }

    return violations;
}

/**
 * @param {SchemaViolation[]} violations
 * @returns {string}
 */
export function formatSchemaViolationsMessage(violations) {
    if (!violations.length) {
        return '';
    }
    const details = [...new Set(violations.map(({ parent, child }) => `${child} inside ${parent}`))].join(', ');
    return `Content does not match the schema; saving will loose the following: ${details}`;
}
