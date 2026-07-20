import { loadSchemaData } from '../../scripts/load-schema.js';

/** Built-in TEI schema (`src/tei-schema.json`), used when `format` is `tei` (default). */
export default () => loadSchemaData('tei-schema.json');
