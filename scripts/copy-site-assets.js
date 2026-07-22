import { copyFile, mkdir } from 'node:fs/promises';

const LIBRARY_ASSETS = [
    { source: 'dist/jinn-tap.es.js', dest: 'site/public/assets/jinn-tap.es.js' },
    { source: 'dist/jinn-toast.es.js', dest: 'site/public/assets/jinn-toast.es.js' },
    { source: 'dist/storage.es.js', dest: 'site/public/assets/storage.es.js' },
    { source: 'dist/jinn-tap.css', dest: 'site/public/assets/jinn-tap.css' },
    { source: 'dist/tei-editor-styles.css', dest: 'site/public/assets/tei-editor-styles.css' },
    { source: 'jats-editor-styles.css', dest: 'site/public/assets/jats-editor-styles.css' },
];

await mkdir('site/public/assets', { recursive: true });

for (const { source, dest } of LIBRARY_ASSETS) {
    await copyFile(source, dest);
    console.log(`✓ ${source} → ${dest}`);
}
