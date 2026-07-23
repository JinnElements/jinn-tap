const GENERIC_TITLES = new Set(['untitled document', 'untitled article', 'untitled']);

/**
 * @param {string} title
 * @returns {boolean}
 */
export function isGenericTitle(title) {
    return !title || GENERIC_TITLES.has(title.trim().toLowerCase());
}

/**
 * True while a deduced title still looks like an incomplete draft
 * (e.g. a single typed letter, or a second word still being typed).
 * Auto-save should keep updating until this returns false.
 *
 * @param {string} title
 * @returns {boolean}
 */
export function isProvisionalTitle(title) {
    if (!title || isGenericTitle(title)) {
        return true;
    }
    const words = title.trim().split(/\s+/).filter(Boolean);
    if (words.length < 2) {
        return true;
    }
    // Require the last word to look finished — "Hello w" stays provisional.
    return words[words.length - 1].length < 3;
}

/**
 * @param {string} text
 * @param {number} [max=80]
 * @returns {string}
 */
export function truncateTitle(text, max = 80) {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= max) {
        return cleaned;
    }
    return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Pull a document title from TEI `titleStmt/title` or JATS `article-title`.
 * @param {string} xml
 * @returns {string|null}
 */
export function extractTitleFromXml(xml) {
    if (!xml || typeof xml !== 'string') {
        return null;
    }
    try {
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        if (doc.querySelector('parsererror')) {
            return null;
        }

        const elements = doc.getElementsByTagName('*');
        /** @type {Element|null} */
        let titleStmtTitle = null;
        /** @type {Element|null} */
        let articleTitle = null;
        /** @type {Element|null} */
        let anyTitle = null;

        for (const el of elements) {
            const name = el.localName;
            if (name === 'title' && el.parentElement?.localName === 'titleStmt') {
                titleStmtTitle = el;
                break;
            }
            if (name === 'article-title' && !articleTitle) {
                articleTitle = el;
            }
            if (name === 'title' && !anyTitle) {
                anyTitle = el;
            }
        }

        const node = titleStmtTitle || articleTitle || anyTitle;
        const text = node?.textContent?.trim();
        return text && !isGenericTitle(text) ? truncateTitle(text) : null;
    } catch {
        return null;
    }
}

/**
 * Deduce a display name for a document.
 *
 * Order: meaningful `metadata.title` → XML header title → first plain-text line → fallback.
 * Short / incomplete titles (fewer than two words) are treated as provisional and
 * do not win over a longer plain-text line, so typing is not frozen after one letter.
 *
 * @param {object} options
 * @param {string} [options.xml]
 * @param {{ title?: string }} [options.metadata]
 * @param {string} [options.plainText]
 * @param {string} [options.fallback='Untitled Document']
 * @returns {string}
 */
export function deduceDocumentName({ xml, metadata, plainText, fallback = 'Untitled Document' } = {}) {
    const firstLine = plainText
        ?.trim()
        .split(/\r?\n/)
        .find((line) => line.trim());
    const fromPlain = firstLine ? truncateTitle(firstLine) : null;

    const metaTitle = metadata?.title?.trim();
    if (metaTitle && !isGenericTitle(metaTitle) && !isProvisionalTitle(metaTitle)) {
        return truncateTitle(metaTitle);
    }

    const fromXml = extractTitleFromXml(xml);
    if (fromXml && !isProvisionalTitle(fromXml)) {
        return fromXml;
    }

    if (fromPlain) {
        return fromPlain;
    }

    if (fromXml) {
        return fromXml;
    }

    if (metaTitle && !isGenericTitle(metaTitle)) {
        return truncateTitle(metaTitle);
    }

    return fallback;
}
