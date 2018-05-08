const webpack = require('webpack');
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  context: path.resolve('./src/'),
  entry: {
    components: [
      './PDFJSAnnotate.js',
      './main.js',
    ]
  },
  output: {
    filename: 'bundle--[name].js',
    path: path.resolve('./build')
  },
  plugins: [
    new CleanWebpackPlugin([
      './dist/*',
      './build/*',
      './docs/demo/*'
    ]),
    new CopyWebpackPlugin([
      {
        from: '../node_modules/pdfjs-dist/web/pdf_viewer.js',
        to: 'shared/',
        flatten: true,
      },
      {
        from: '../node_modules/pdfjs-dist/web/pdf_viewer.css',
        to: 'shared/',
        flatten: true,
      },
      {
        from: '../node_modules/pdfjs-dist/build/pdf.js',
        to: 'shared/',
        flatten: true,
      },
      {
        from: '../node_modules/pdfjs-dist/build/pdf.worker.js',
        to: 'shared/',
        flatten: true,
      },
      {
        from: '../node_modules/pdfjs-dist/web/images/*',
        to: 'shared/images',
        flatten: true,
      },
      {
        from: '../src/UI/inc/*',
        to: 'shared/',
        flatten: true,
      },
      {
        from: '../src/example.pdf',
        to: './',
        flatten: true,
      },
      {
        from: '../src/index.html',
        to: './',
        flatten: true,
      },
      {
        from: '../src/main.js',
        to: './',
        flatten: true,
      }
    ]),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: require('./babelrc.js'),
      },
    ]
  },
};
