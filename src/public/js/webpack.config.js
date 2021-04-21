const path = require('path');

module.exports = {
  entry: {
    DocPage: {
      import: './DocPage.js',
      filename: 'DocPage.bundle.js',
    },
    CollationTableEdit: {
      import: './CollationTableEditor.js',
      filename: 'CollationTableEditor.bundle.js'
    },
    CollationTableEditorNew: {
      import: './CollationTableEditorNew.js',
      filename: 'CollationTableEditorNew.bundle.js'
    },
    AutomaticCollationTable: {
      import: './AutomaticCollationTable.js',
      filename: 'AutomaticCollationTable.bundle.js'
    },
    ChunkPage: {
      import: './ChunkPage.js',
      filename: 'ChunkPage.bundle.js'
    },

    // FUNCTIONAL TESTS
    TestArrayToTable: {
      import: '../test/js/functional/TestArrayToTable.js',
      filename: '../../test/js/functional/dist/TestArrayToTable.bundle.js'
    }

  },
  externals: {
    jquery: 'jQuery'
  },
  mode: 'development',
  devtool: 'inline-source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
  }
};
