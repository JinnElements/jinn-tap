import { defineConfig } from 'vite'

export default defineConfig({
  base: '/jinn-tap/',
  build: {
    lib: {
      entry: {
        'jinn-tap': 'src/jinn-tap.js',
        'jinn-toast': 'src/components/jinn-toast.js',
        'index': 'src/index.js'
      },
      formats: ['es']
    },
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: false,
    commonjsOptions: {
      sourceMap: true
    }
  },
  server: {
    port: 5174,
    host: true
  },
  optimizeDeps: {
    esbuildOptions: {
      sourcemap: true
    }
  }
})