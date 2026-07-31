import { loadSchemaData } from '../../scripts/load-schema.js';

/** Built-in DocBook schema (`src/docbook-schema.json`), used when `format="docbook"`. */
export default () => loadSchemaData('docbook-schema.json');
