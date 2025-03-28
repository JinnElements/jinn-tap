import { defineConfig } from 'vite'

export default defineConfig({
  base: '/jinn-tap/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        demo: 'src/demo.js'
      }
    }
  }
}) 