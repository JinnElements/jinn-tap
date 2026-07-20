---
layout: layouts/doc.njk
title: "Embedding in an app"
section: guide
permalink: /guide/embedding/index.html
embedEditor: true
---

# Embedding in an app

`<jinn-tap>` is a standard custom element, so it works in any framework or plain HTML.

## Plain HTML

```html
<jinn-tap url="document.xml"></jinn-tap>
<script type="module" src="/path/to/jinn-tap.es.js"></script>
```

## Toolbar and sidebar slots

The component renders its own toolbar and attribute panel (as a bottom dock by
default). Authority connector panels dock in a right column when the component is
wide enough to fit
[`--jinn-tap-content-max-width`](/guide/customizing#layout-and-connector-panels)
plus the connector panel without shrinking the content; otherwise they open as a
slide-over overlay. You can inject extra controls with named slots
(`toolbar`, `aside`), and place the attribute panel or toolbar in your own
containers with the
[`toolbar`](/api/attributes#toolbar) / [`sidebar`](/api/attributes#sidebar)
attributes. For fixed-height hosts (embeds, workbenches), add
[`fill`](/api/attributes#fill) so only the editor area scrolls:

```html
<jinn-tap url="document.xml">
  <img slot="aside" class="logo" src="logo.png" alt="Logo" />
  <li slot="toolbar">
    <a href="#" class="toolbar-button" data-tooltip="Download XML">
      <i class="bi bi-download"></i>
    </a>
  </li>
</jinn-tap>
```

## Frameworks with SSR (Vue, etc.)

The editor is browser-only. Under server-side rendering, register and mount it on the
client, and tell the framework to treat `jinn-tap` as a custom element. These docs
themselves embed the editor exactly this way — see
`site/_includes/partials/jinn-tap-embed.njk` in the repository for a plain HTML example:

```js
// client-only
await import('@jinntec/jinntap'); // registers <jinn-tap> and <jinn-toast>
```

```js
// Vue: leave hyphenated tags to the browser
compilerOptions: { isCustomElement: (tag) => tag.includes('-') }
```

## Real-time collaboration

Collaboration is enabled by pointing the editor at a
[Hocuspocus](https://tiptap.dev/docs/hocuspocus/introduction) server via the
`server`, `token`, `name` and user attributes:

```html
<jinn-tap
  url="document.xml"
  server="ws://localhost:8082"
  name="my-document"
  token="…"
  user="Ada"
  color="#3366ff"></jinn-tap>
```

When collaboration is active and a document fails the schema check, the editor
switches to read-only rather than dropping markup. See
[Attributes](/api/attributes#collaboration) for the full list.

## Authority lookups

Attributes configured with a [connector](/schema/attributes#connectors) (e.g. the
`key`/`corresp` attribute of `persName` or `rs`) show an authority search panel. These
are powered by `@teipublisher/pb-components`; load its bundle to enable them:

```html
<script type="module"
  src="https://cdn.jsdelivr.net/npm/@teipublisher/pb-components@3.6.6/dist/pb-components-bundle.js"></script>
```
