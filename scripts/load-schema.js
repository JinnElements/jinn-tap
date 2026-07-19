import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function normalizeAttributes(defs) {
    const seen = new Map();
    for (const def of defs) {
        for (const [name, attr] of Object.entries(def.attributes ?? {})) {
            if (seen.has(name)) continue;
            seen.set(name, {
                name,
                type: attr.type ?? 'string',
                default: attr.default ?? null,
                enum: attr.enum ?? null,
                connector: attr.connector
                    ? { name: attr.connector.name, type: attr.connector.type ?? null }
                    : null,
            });
        }
    }
    return [...seen.values()];
}

/**
 * @param {string} filename Schema JSON under `src/` (e.g. `tei-schema.json`, `jats-schema.json`)
 */
export function loadSchemaData(filename = 'tei-schema.json') {
    const schemaPath = fileURLToPath(new URL(`../src/${filename}`, import.meta.url));
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

    const elements = Object.entries(schema.schema ?? {})
        .map(([name, rawDef]) => {
            const defs = Array.isArray(rawDef) ? rawDef : [rawDef];
            const base = defs[0] ?? {};
            const types = [...new Set(defs.map((d) => d.type).filter(Boolean))];
            const attributes = normalizeAttributes(defs);
            return {
                name,
                types,
                conditional: Array.isArray(rawDef),
                content: base.content ?? null,
                defining: !!base.defining,
                selectable: !!base.selectable,
                group: base.group ?? null,
                tagName: base.tagName ?? null,
                attributes,
                hasToolbar: defs.some((d) => d.toolbar),
                hasKeyboard: defs.some((d) => d.keyboard),
                hasInputRules: defs.some((d) => Array.isArray(d.inputRules)),
                hasConnector: attributes.some((a) => a.connector),
                connectorAttributes: attributes.filter((a) => a.connector),
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    const typeCounts = {};
    for (const el of elements) {
        for (const t of el.types) typeCounts[t] = (typeCounts[t] ?? 0) + 1;
    }

    return {
        filename,
        elements,
        elementCount: elements.length,
        typeCounts,
        typeCountsList: Object.entries(typeCounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([type, count]) => ({ type, count })),
        globalAttributes: Object.entries(schema.attributes ?? {}).map(([name, def]) => ({
            name,
            type: def.type ?? 'string',
        })),
        selects: Object.entries(schema.selects ?? {}).map(([name, def]) => ({
            name,
            order: def.order ?? null,
        })),
        globalToolbar: Object.keys(schema.toolbar ?? {}),
    };
}
