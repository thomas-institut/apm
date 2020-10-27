const path = require('path');
// var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    DocPage: {
      import: './DocPageLoader.js',
      filename: 'DocPage.bundle.js',
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
  },
  // plugins: [new HtmlWebpackPlugin()]
};
