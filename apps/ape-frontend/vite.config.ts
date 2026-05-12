// @ts-ignore
import {defineConfig} from 'vite';
import {resolve} from 'path';
// @ts-ignore
import react from '@vitejs/plugin-react';

export default defineConfig({

  plugins: [react({})],
  build: {
    outDir: 'dist',
    manifest: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        // Main
        Main: resolve(__dirname, 'index.html'),
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
});


