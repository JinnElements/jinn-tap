import { loadSchemaData } from '../../scripts/load-schema.js';

/** Built-in JATS schema (`src/jats-schema.json`), used when `format="jats"`. */
export default () => loadSchemaData('jats-schema.json');
