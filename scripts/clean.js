import { rm } from 'node:fs/promises';

/** Build and Eleventy caches / generated site assets. */
const PATHS = [
    'dist',
    '.cache',
    'node_modules/.cache',
    'site/public/assets',
    'site/public/demo',
];

for (const path of PATHS) {
    await rm(path, { recursive: true, force: true });
    console.log(`✓ removed ${path}`);
}
