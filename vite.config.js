import { defineConfig } from 'vite'

export default defineConfig({
  base: '/editor-test/',  // Replace with your repository name
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
}) 