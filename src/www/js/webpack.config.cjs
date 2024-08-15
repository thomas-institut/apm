const path = require('path');

module.exports = {
  entry: {
    QuillPack: {
      import: './QuillLoader.js',
      filename: 'Quill.bundle.js'
    },
    DocPage: './pages/DocPage.js',
    DocumentsPage: './pages/DocumentsPage.js',
    WorksPage: './pages/WorksPage.js',
    WorkPage: './pages/WorkPage.js',
    DocDefPages: './pages/DocDefPages.js',
    DocEditPage: './pages/DocEditPage.js',
    DocNewDocPage: './pages/DocNewDocPage.js',
    ErrorPage: './pages/ErrorPage.js',
    AdminEntityPage: './pages/AdminEntityPage/AdminEntityPage.js',
    PageViewer: './pages/PageViewer/PageViewer.js',
    CollationTableEditor: './pages/CollationTableEditor.js',
    EditionComposer: {
      import: './EditionComposer/EditionComposer.js',
      filename: 'EditionComposer.bundle.js',
      dependOn: 'QuillPack',
    },
    PeoplePage: './pages/PeoplePage.js',
    PersonPageNew: './pages/PersonPageNew.js',
    MceComposer: {
      import: './MceComposer/MceComposer.js',
      filename: 'MceComposer.bundle.js',
    },
    AutomaticCollationTable: './pages/AutomaticCollationTable/AutomaticCollationTable.js',
    ChunkPage: './pages/ChunkPage.js',
    ApmLogPage: './pages/ApmLogPage.js',
    DashboardPage: './pages/DashboardPage.js',
    SearchPage: './pages/SearchPage.js',
    DevelopmentEntityDataEditor: './pages/DevelopmentEntityDataEditor.js',
    // JASMINE TESTS
    JasmineTests: {
      import: '../test/js/modules-to-test.js',
      filename: '../../test/js/JasmineTests.bundle.js'
    },
    // FUNCTIONAL TESTS
    // TestMultiPanelUI2: {
    //   import: '../test/js/functional/TestMultiPanelUI2.js',
    //   filename: '../../test/js/functional/dist/TestMultiPanelUI2.bundle.js'
    // },

  },
  externals: {
    jquery: 'jQuery'
  },
  mode: 'development',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.svg$/i,
        use:  [{ loader: 'html-loader', options: { minimize: false, esModule: false } }]
      }
    ],
  },
};
