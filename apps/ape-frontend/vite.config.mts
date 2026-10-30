import {resolve} from 'node:path';
import react from '@vitejs/plugin-react';
import type {UserConfig} from 'vite';

export default {
  server: {
    port: 5180
  },
  plugins: [react({})],
  build: {
    outDir: 'dist',
    manifest: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        // Main
        Main: resolve(import.meta.dirname, 'index.html'),
      },
      output: {
        entryFileNames: '[name]-[hash].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash][extname]',
      }
    },
  },
  // @ts-ignore
  test: {
    globals: true,
    projects: ['test'],
  },
  resolve: {
    tsconfigPaths: true,
  },
} as UserConfig;


