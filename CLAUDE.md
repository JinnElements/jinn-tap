# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

JinnTap (`@jinntec/jinntap`) is a `<jinn-tap>` web component: a rich-text editor (built on Tiptap/ProseMirror)
where the in-editor representation *is* the document's structure — TEI or JATS XML elements are mapped 1:1 to
HTML custom elements (`tei-div`, `tei-p`, `jats-sec`, …) with all attributes preserved, so there is no lossy
HTML round-trip. It's meant to be embedded in a larger host application (e.g. TEI Publisher) but also ships a
standalone documentation/demo site.

## Commands

```bash
# Install
npm install

# Build the library into dist/ (also runs postbuild → scripts/copy-assets.js)
npm run build

# Vite dev server for manual testing / Cypress fixtures (serves test/*.html on :5174)
npm run dev

# Docs site (Eleventy) with hot reload — builds the library first, then serves site/
npm run docs:dev

# Build library + docs site together into dist/
npm run build:site

# Cypress e2e tests (require the Vite dev server; baseUrl is localhost:5174/jinn-tap)
npm run cypress:open        # interactive
npm run cypress:run         # headless, all specs
npm test                    # alias for cypress:run
npx cypress run --spec cypress/e2e/tables.cy.js   # a single spec

# Format
npm run format               # prettier --write, incl. XQuery via prettier-plugin-xquery

# Local collaboration server (Hocuspocus/Yjs), also used by Dockerfile
npm run collab-server
```

There is no lint script and no unit-test runner — correctness is checked with the Cypress e2e suite
(`cypress/e2e/*.cy.js`) against `test/*.html` fixtures.

### ⚠️ `dist/` is shared and gets wiped

Vite's `outDir` is `dist/` with `emptyOutDir: true`, and Eleventy's docs site *also* builds into `dist/`
(`eleventy.config.js` → `dir.output: 'dist'`). Running `npm run build` while a `docs:dev` server has already
generated the site will silently delete all the generated HTML pages (only the JS/CSS bundles survive). If
that happens, restore the site with a plain `npx @11ty/eleventy` (no `--serve`) — this rewrites `dist/` from
`site/src` without re-touching the Vite output. Prefer this order when both need rebuilding:
`npm run build && node scripts/copy-site-assets.js && npx @11ty/eleventy`.

## Architecture

### Schema-driven extension generation

There is no hand-written Tiptap extension per element. `src/tei-schema.json` (TEI) and `src/jats-schema.json`
(JATS) each declare, per XML element name, a `type` (`block`, `inline`, `list`, `listItem`, `empty`, `anchor`,
`ref`, `graphic`, `table`/`row`/`cell`), plus its `attributes`, `toolbar` button(s), `keyboard` shortcuts, and
`inputRules`. `src/extensions/extensions.js#createFromSchema` walks this definition at editor-setup time and
generates the actual Tiptap node/mark classes by extending the small set of base extensions in
`src/extensions/*.js` (`JinnBlock`, `JinnInline`, `JinnList`/`JinnItem`, `JinnEmptyElement`, `JinnAnchor`,
`JinnReference`, `JinnGraphic`, table nodes). This is the first place to look when an element behaves oddly —
the fix is almost always a schema entry or a base extension, not a new one-off extension.

A schema entry may also be an **array of conditional definitions** with a `when: {attr: value}` matcher, so one
XML element name can map to different node types depending on an attribute (e.g. a `ref` that's a citation vs.
an external link). See `createFromSchema`'s handling of `def.when`/sibling exclusion.

Both schemas share one loader: `scripts/load-schema.js` (`loadSchemaData`) parses either JSON file into a
uniform shape (element list, type counts, global attributes/toolbar/selects) — this is what the docs site's
Eleventy data files (`site/_data/schema.js`, `site/_data/jatsSchema.js`) expose to templates.

Format differences (TEI vs. JATS) beyond the schema itself — custom-element prefix, root/body element names,
note/anchor node names, which side of a footnote link carries the `target`/`rid`, the blank-document template —
live in `src/util/xml-formats.js` (`TEI_FORMAT` / `JATS_FORMAT` / `FORMATS`). `format` is fixed at
`<jinn-tap>` initialization and cannot be changed on a live instance (use `.load(format, url)` to swap, which
tears down and rebuilds the editor).

### XML ⇄ editor conversion runs through XQuery, in the browser

`src/util/xml.js` converts real XML into the prefixed-HTML-custom-element form the editor edits, and back,
by evaluating XQuery **client-side** via `fontoxpath`. The actual transform logic lives in
`src/util/module-tei.xq` / `src/util/module-jats.xq` (functions `jt:import`, `jt:export`, `jt:new-document`),
imported into Vite via `?raw` and registered as XQuery modules at module load time. If TEI/JATS import/export
behavior needs to change (e.g. how an attribute round-trips, or how notes get wired to anchors), it's usually
these `.xq` modules that need editing, not `xml.js` itself. `src/util/serialize.js` handles the ProseMirror
document → HTML string side of export before it's handed to `jt:export`.

### Unknown elements are synthesized, not dropped

`src/util/unknown-elements.js` (`synthesizeUnknownEntries`) scans imported content for prefixed elements with
no schema entry and fabricates a generic schema entry for them (inferring empty/block/inline from actual usage,
to a fixpoint since classification can depend on other unknown elements). `JinnTap.content`/`.xml` setters call
this before applying new content and rebuild the editor (`_rebuildEditor`) if new element types were
introduced, since a live ProseMirror schema can't be mutated in place.

### The web component itself

`src/jinn-tap.js` (`JinnTap` custom element) wires everything together: builds the schema-derived extensions,
constructs `Toolbar` (`src/toolbar.js`), `AttributePanel` (`src/attribute-panel.js`) and `NavigationPanel`
(`src/navigator.js`), and owns the `content`/`xml`/`format` getters/setters and the `content-change`/`ready`
events. Toolbar and attribute-panel content can be hosted in external containers via the `toolbar="…"` /
`sidebar="…"` selector attributes instead of the built-in slots — this is how host apps place them elsewhere in
their own layout. By default the attribute panel is a bottom dock inside `<jinn-tap>` (authority connectors
expand into a slide-over drawer); `sidebar` opts into an external host with a traditional side-panel layout.

Notes/footnotes have two independent axes: **connected vs. disconnected** mode (`notes` attribute — whether
deleting an anchor deletes its note) and **note-to-anchor vs. anchor-to-note** linking direction (which side of
the pair carries the `target`/`rid`, per format). Both are handled in `src/extensions/footnote.js`.

The attribute panel supports optional **authority/connector lookups** (GND, GeoNames, Airtable, …) per
attribute (`attributes.<name>.connector` in the schema), which render a `pb-authority-lookup`/`pb-authority`
search UI — this requires the peer dependency `@teipublisher/pb-components` to be loaded by the host page;
without it the plain input still works, just without the search.

### Docs site (Eleventy)

`site/` is a separate Eleventy site (input `site/src`, output shared `dist/`, base path `/jinn-tap/`) that both
documents the component and embeds live `<jinn-tap>` instances via `site/_includes/partials/jinn-tap-embed.njk`.
A few things that aren't obvious from the templates alone:

- Internal links are **not** auto-prefixed by Eleventy's `pathPrefix` for every attribute — `href`s are rewritten
  by a manual regex transform in `eleventy.config.js` (`prefix-internal-links`) that only matches a hardcoded
  set of path segments (`editing|guide|api|schema|demo|css|assets`), and it only touches `href`, never `src`.
  Anything else (e.g. `<img src="/screenshots/...">`, a path segment not in that list) needs the `prefixUrl`
  Nunjucks filter explicitly: `{{ '/path' | prefixUrl }}`.
- `.md` files are run through the `njk` template engine *before* markdown-it, so raw HTML blocks (`<aside>`,
  `<div>`) can end up with stray `<p>` wrapping or unrendered Markdown syntax inside them if a Nunjucks tag
  leaves behind a blank line (breaks CommonMark's HTML-block continuation) — use `{%-`/`-%}` whitespace control,
  or just write plain HTML (no Markdown syntax) inside those blocks.
- `site/public/assets/` is pure build output (copied from `dist/`/root files by `scripts/copy-site-assets.js`)
  and gets overwritten on every rebuild — don't hand-edit or add unrelated files there.
- The demo document embedded by default is `site/public/demo/starter.xml` (TEI) /
  `site/public/demo/starter-jats.xml` (JATS), intentionally short (a "getting
  started" sample), not a full feature showcase.
