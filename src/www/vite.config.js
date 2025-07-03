import { defineConfig } from 'vite'
//import vue from '@vitejs/plugin-vue' // optional
import { resolve } from 'path'

export default defineConfig({
  //plugins: [vue()],
  build: {
    outDir: 'js/dist/vite',
    manifest: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        DashboardPage: resolve(__dirname, 'js/pages/DashboardPage.js'),
        WorkPage: resolve(__dirname, 'js/pages/WorkPage.js'),
        WorksPage: resolve(__dirname, 'js/pages/WorksPage.js'),
        DocPage: resolve(__dirname, 'js/pages/DocPage.js'),
        DocDefPages: resolve(__dirname, 'js/pages/DocDefPages.js'),
        PeoplePage: resolve(__dirname, 'js/pages/PeoplePage.js'),
        PersonPage: resolve(__dirname, 'js/pages/PersonPage.js'),
        ErrorPage: resolve(__dirname, 'js/pages/ErrorPage.js'),
        DocumentsPage: resolve(__dirname, 'js/pages/DocumentsPage.js'),
        ChunkPage: resolve(__dirname, 'js/pages/ChunkPage.js'),
        AdminEntityPage: resolve(__dirname, 'js/pages/AdminEntityPage/AdminEntityPage.js'),
        DevelopmentEntityDataEditor: resolve(__dirname, 'js/pages/DevelopmentEntityDataEditor.js'),
        SearchPage: resolve(__dirname, 'js/pages/SearchPage.js'),
        EditionComposer: resolve(__dirname, 'js/EditionComposer/EditionComposer.js'),
        MceComposer: resolve(__dirname, 'js/MceComposer/MceComposer.js'),
        CollationTableEditor: resolve(__dirname, 'js/pages/CollationTableEditor.js'),
        AutomaticCollationTable: resolve(__dirname, 'js/pages/AutomaticCollationTable/AutomaticCollationTable.js'),
        PageViewer: resolve(__dirname, 'js/pages/PageViewer/PageViewer.js')
      },
      output: {
        entryFileNames: '[name]-[hash].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash][extname]',
      }
    }
  },
  test: {
    projects: ['test/js']
  }
})
