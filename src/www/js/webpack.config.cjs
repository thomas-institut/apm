const path = require('path');

module.exports = {
  entry: {
    PageViewer: './pages/PageViewer/PageViewer.js',
    // JASMINE TESTS
    JasmineTests: {
      import: '../test/js/modules-to-test.js',
      filename: '../../test/js/JasmineTests.bundle.js'
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
