---
layout: layouts/doc.njk
title: "Attributes & connectors"
section: schema
permalink: /schema/attributes/index.html
---

# Attributes & connectors

Attributes are declared in two places: globally under the top-level `attributes` key
(offered on every element) and per element under an entry's own `attributes`.

## Attribute definitions

Each attribute maps its name to a definition:

```jsonc
"rend": {
  "type": "string",          // value type
  "default": "i",            // optional default value
  "enum": ["i", "b", "u", "code"]  // optional fixed set of allowed values
}
```

| Property | Meaning |
| --- | --- |
| `type` | The value type (`string`). |
| `default` | Value applied when the element is created without an explicit value. |
| `enum` | Restricts the value to a fixed list (rendered as a dropdown in the sidebar). |
| `connector` | Turns the attribute into an authority-lookup field. See [below](#connectors). |

<h2 id="global-attributes">Global attributes</h2>

Declared once and available on every element:

<table>
  <thead><tr><th>Attribute</th><th>Type</th></tr></thead>
  <tbody>
    {% for a in schema.globalAttributes %}<tr>
      <td><code>{{ a.name }}</code></td>
      <td><code>{{ a.type }}</code></td>
    </tr>{% endfor %}
  </tbody>
</table>

<h2 id="connectors">Connectors</h2>

A `connector` on an attribute wires it to an **authority service**: instead of typing a
raw value, the editor shows a search panel and stores the chosen entry's identifier.

```jsonc
"persName": {
  "type": "inline",
  "attributes": {
    "key": {
      "type": "string",
      "connector": { "name": "GND", "type": "person", "prefix": "gnd" }
    }
  }
}
```

| Property | Meaning |
| --- | --- |
| `name` | The authority provider: `GND`, `GeoNames`, `Airtable`, … |
| `type` | The record type to search (e.g. `person`, `organization`, `place`, `term`). |
| `prefix` | Prefix prepended to the stored identifier (e.g. `gnd` → `gnd-118774352`). |
| `user` | Provider-specific account/user, where required (e.g. GeoNames). |

Providers such as **Airtable** take additional configuration (`base`, `api-key`,
`table`, `fields`, `filter`, …) forwarded to the underlying `pb-authority` element.

<aside class="callout callout-warning"><strong>Runtime dependency</strong>
Connectors are rendered by `@teipublisher/pb-components` (a peer dependency). Load its
bundle to enable the lookup panels — see
[Installation](/guide/installation#authority-lookups).
</aside>

## Elements with connectors in the default schema

<ul>
{% for el in schema.elements | connectorElements %}
  <li><code>{{ el.name }}</code> —
    {% for a in el.connectorAttributes %}
      <code>{{ a.name }}</code> ({{ a.connector.name }}{% if a.connector.type %}/{{ a.connector.type }}{% endif %}){% if not loop.last %}, {% endif %}
    {% endfor %}
  </li>
{% endfor %}
</ul>
