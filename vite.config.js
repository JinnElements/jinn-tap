import { defineConfig } from 'vite'

export default defineConfig({
  base: '/jinn-tap/',
  build: {
    lib: {
      entry: 'src/jinn-tap.js',
      name: 'JinnTap',
      fileName: (format) => `jinn-tap.${format}.js`,
      formats: ['es', 'umd']
    },
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: false
  },
  server: {
    port: 5174,
    host: true
  }
})