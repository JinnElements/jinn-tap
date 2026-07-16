import { copyFile, mkdir, rm } from 'node:fs/promises';

const LIBRARY_ASSETS = [
    { source: 'dist/jinn-tap.es.js', dest: 'site/public/assets/jinn-tap.es.js' },
    { source: 'dist/jinn-tap.css', dest: 'site/public/assets/jinn-tap.css' },
    { source: 'dist/editor-styles.css', dest: 'site/public/assets/editor-styles.css' },
    { source: 'jats-editor-styles.css', dest: 'site/public/assets/jats-editor-styles.css' },
];

/** Sample XML and related files served under /demo/ for embedded editors */
const SAMPLE_DOCUMENTS = [
    'docs.xml',
    'musk-trump-tei-publisher.xml',
    'musk-trump.png',
    'jinntap-logo-128.png',
];

await mkdir('site/public/assets', { recursive: true });
await rm('site/public/demo', { recursive: true, force: true });
await mkdir('site/public/demo', { recursive: true });

for (const { source, dest } of LIBRARY_ASSETS) {
    await copyFile(source, dest);
    console.log(`✓ ${source} → ${dest}`);
}

for (const name of SAMPLE_DOCUMENTS) {
    const source = `public/${name}`;
    const dest = `site/public/demo/${name}`;
    await copyFile(source, dest);
    console.log(`✓ ${source} → ${dest}`);
}
