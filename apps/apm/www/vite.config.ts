import { defineConfig } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'


export default defineConfig({
  plugins: [react({})],
  build: {
    outDir: 'dist',
    manifest: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        // Main pages
        PersonPage: resolve(__dirname, 'js/pages/PersonPage.ts'),
        ErrorPage: resolve(__dirname, 'js/pages/ErrorPage.ts'),
        ChunkPage: resolve(__dirname, 'js/pages/ChunkPage.ts'),

        // Ancillary pages that should disappear
        DocPage: resolve(__dirname, 'js/pages/DocPage.ts'),
        DocDefPages: resolve(__dirname, 'js/pages/DocDefPages.js'),

        EditionComposer: resolve(__dirname, 'js/EditionComposer/EditionComposer.ts'),
        AutomaticCollationTable: resolve(__dirname, 'js/pages/AutomaticCollationTable/AutomaticCollationTable.ts'),
        PageViewer: resolve(__dirname, 'js/pages/PageViewer/PageViewer.js'),
        React_Main: resolve(__dirname, 'js/ReactAPM/index.tsx'),
      },
      output: {
        entryFileNames: '[name]-[hash].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash][extname]',
      }
    },
  },
  test: {
    globals: true,
    projects: ['test/js'],
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@': resolve(__dirname, './js'),
    }
  },
})


