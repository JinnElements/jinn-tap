---
layout: layouts/doc.njk
title: "Installation"
section: guide
permalink: /guide/installation/index.html
---

# Installation

## From npm

```bash
npm install @jinntec/jinntap
```

The package ships as an ES module with the web component and its styles under `dist/`.

```html
<head>
  <!-- Optional but recommended base styling -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />

  <!-- JinnTap: the editor chrome and the styles for displaying TEI documents -->
  <link rel="stylesheet" href="node_modules/@jinntec/jinntap/dist/jinn-tap.css" />
  <link rel="stylesheet" href="node_modules/@jinntec/jinntap/dist/editor-styles.css" />

  <script type="module" src="node_modules/@jinntec/jinntap/dist/jinn-tap.es.js"></script>
</head>
<body>
  <jinn-tap></jinn-tap>
</body>
```

Once the module has loaded, the `<jinn-tap>` custom element is registered and any
`<jinn-tap>` in the page becomes an editor.

<aside class="callout" id="authority-lookups"><strong>Authority lookups</strong>
<p>The GND/GeoNames/Airtable <a href="{{ '/schema/attributes/' | prefixUrl }}#connectors">connectors</a> are provided by
<code>@teipublisher/pb-components</code> (a peer dependency). Load its bundle only if you use
those features:</p>

```html
<script type="module"
  src="https://cdn.jsdelivr.net/npm/@teipublisher/pb-components@3.6.6/dist/pb-components-bundle.js"></script>
```
</aside>

## Building from source

Node.js 20+ and npm 7+ are recommended.

```bash
git clone https://github.com/JinnElements/jinn-tap.git
cd jinn-tap
npm ci

npm run build        # build the library into dist/
npm run docs:dev     # work on the docs site locally
npm run build:site   # build the docs site into dist/
```

See the [Usage](/guide/usage) page for a first document, or
[Customizing the editor](/guide/customizing) / the
[Schema reference](/schema/) to tailor which elements the editor supports.
