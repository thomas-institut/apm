const path = require('path');

module.exports = {
  entry: {
    QuillPack: {
      import: './QuillLoader.js',
      filename: 'Quill.bundle.js'
    },
    DocPage: {
      import: './pages/DocPage.js',
      filename: 'DocPage.bundle.js',
    },
    DocDefPages: {
      import: './pages/DocDefPages.js',
      filename: 'DocDefPages.bundle.js'
    },
    DocEditPage: {
      import: './pages/DocEditPage.js',
      filename: 'DocEditPage.bundle.js',
    },
    DocNewDocPage: {
      import: './pages/DocNewDocPage.js',
      filename: 'DocNewDocPage.bundle.js',
    },
    CollationTableEditor: {
      import: './pages/CollationTableEditor.js',
      filename: 'CollationTableEditor.bundle.js'
    },
    EditionComposer: {
      import: './EditionComposer/EditionComposer.js',
      filename: 'EditionComposer.bundle.js',
      dependOn: 'QuillPack',
    },
    MceComposer: {
      import: './MceComposer/MceComposer.js',
      filename: 'MceComposer.bundle.js',
      // dependOn: 'QuillPack',
    },
    AutomaticCollationTable: {
      import: './pages/AutomaticCollationTable/AutomaticCollationTable.js',
      filename: 'AutomaticCollationTable.bundle.js'
    },
    ChunkPage: './pages/ChunkPage.js',
    ApmLogPage: './pages/ApmLogPage.js',
    DashboardPage: './pages/DashboardPage.js',
    SearchPage: './pages/SearchPage.js',
    UserManager: {
      import: './pages/UserManagerPage.js',
      filename: 'UserManagerPage.bundle.js'
    },
    UserProfile: {
      import: './pages/UserProfilePage.js',
      filename: 'UserProfilePage.bundle.js'
    },
    // JASMINE TESTS
    JasmineTests: {
      import: '../test/js/modules-to-test.js',
      filename: '../../test/js/JasmineTests.bundle.js'
    },

    // FUNCTIONAL TESTS
    TestArrayToTable: {
      import: '../test/js/functional/TestArrayToTable.js',
      filename: '../../test/js/functional/dist/TestArrayToTable.bundle.js'
    },

    TestMultiPanelUI: {
      import: '../test/js/functional/TestMultiPanelUI.js',
      filename: '../../test/js/functional/dist/TestMultiPanelUI.bundle.js'
    },

    TestWords: {
      import: '../test/js/functional/TestWords.js',
      filename: '../../test/js/functional/dist/TestWords.bundle.js'
    },
    TestHtmlRenderer: {
      import: '../test/js/functional/TestFmtTextRenderer.js',
      filename: '../../test/js/functional/dist/TestFmtTextRenderer.bundle.js'
    },

    TestFreeTextEditor: {
      import: '../test/js/functional/TestFreeTextEditor.js',
      dependOn: 'QuillPack',
      filename: '../../test/js/functional/dist/TestFreeTextEditor.bundle.js'
    },
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
