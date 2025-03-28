import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/jinn-tap.js',
      name: 'JinnTap',
      fileName: (format) => `jinn-tap.${format}.js`,
      formats: ['es', 'umd']
    },
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true
  }
})