import {resolve} from 'node:path';
import react from '@vitejs/plugin-react';
import type {UserConfig} from 'vite';

export default {
  plugins: [react({})],
  build: {
    outDir: 'dist',
    manifest: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        // Main pages
        PersonPage: resolve(import.meta.dirname, 'js/pages/PersonPage.ts'),
        ErrorPage: resolve(import.meta.dirname, 'js/pages/ErrorPage.ts'),
        ChunkPage: resolve(import.meta.dirname, 'js/pages/ChunkPage.ts'),

        // Ancillary pages that should disappear
        DocPage: resolve(import.meta.dirname, 'js/pages/DocPage.ts'),
        DocDefPages: resolve(import.meta.dirname, 'js/pages/DocDefPages.js'),

        EditionComposer: resolve(import.meta.dirname, 'js/EditionComposer/EditionComposer.ts'),
        AutomaticCollationTable: resolve(import.meta.dirname, 'js/pages/AutomaticCollationTable/AutomaticCollationTable.ts'),
        PageViewer: resolve(import.meta.dirname, 'js/pages/PageViewer/PageViewer.js'),
        React_Main: resolve(import.meta.dirname, 'js/ReactAPM/index.tsx'),
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
      '@': resolve(import.meta.dirname, './js'),
    }
  },
} as UserConfig;


