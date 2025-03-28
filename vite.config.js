import { defineConfig } from 'vite'

export default defineConfig({
  base: '/jinn-tap/',  // Replace with your repository name
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
})