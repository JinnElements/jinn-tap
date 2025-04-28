import { copyFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

const FILES_TO_COPY = [
    { source: 'editor-styles.css', dest: 'dist/editor-styles.css' },
    { source: 'src/jinn-tap.css', dest: 'dist/jinn-tap.css' },
    { source: 'public/jinntap-logo.png', dest: 'dist/jinntap-logo.png' },
    { source: 'public/jinntap-logo-128.png', dest: 'dist/jinntap-logo-128.png' }
];

async function copyAssets() {
    try {
        // Ensure the dist directory exists
        await mkdir('dist', { recursive: true });
        
        // Copy all files
        await Promise.all(FILES_TO_COPY.map(async ({ source, dest }) => {
            try {
                await copyFile(source, dest);
                console.log(`✓ ${source} copied to dist successfully`);
            } catch (err) {
                console.error(`Error copying ${source}:`, err);
                throw err;
            }
        }));
    } catch (err) {
        console.error('Error during file copying:', err);
        process.exit(1);
    }
}

copyAssets();