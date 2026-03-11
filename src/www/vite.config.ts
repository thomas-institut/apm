/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'


//
// Plugin to serve reactAPM/index.html for all non-asset routes under /reactAPM/
//
const reactAPM = () => ({
  name: 'configure-server',
  configureServer(server:any) {
    server.middlewares.use((req:any, res:any, next: any) => {
      if (req.url.startsWith('/reactAPM/') &&
        !req.url.endsWith('.js') && !req.url.endsWith('.css') &&
        !req.url.endsWith('.ts') && !req.url.endsWith('.tsx') &&
        !req.url.includes('.')) {
        // Serve newVersion/index.html for all non-asset routes under /newVersion/
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/html')
        res.end(require('fs').readFileSync(resolve(__dirname, 'reactAPM/index.html')))
        return
      }
      next()
    })
  },
})


export default defineConfig({

  plugins: [react({}), reactAPM()],
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
        AdminEntityPage: resolve(__dirname, 'js/pages/AdminEntityPage/AdminEntityPage.js'),

        // Ancillary pages that should disappear
        DocPage: resolve(__dirname, 'js/pages/DocPage.js'),
        DocDefPages: resolve(__dirname, 'js/pages/DocDefPages.js'),

        EditionComposer: resolve(__dirname, 'js/EditionComposer/EditionComposer.ts'),
        MceComposer: resolve(__dirname, 'js/MceComposer/MceComposer.ts'),
        AutomaticCollationTable: resolve(__dirname, 'js/pages/AutomaticCollationTable/AutomaticCollationTable.ts'),
        PageViewer: resolve(__dirname, 'js/pages/PageViewer/PageViewer.js'),
        React_Main: resolve(__dirname, 'js/reactAPM/index.tsx'),
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
    alias: {
      '@': resolve(__dirname, './js'),
    }
  },
})


