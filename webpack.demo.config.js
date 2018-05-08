const webpack = require('webpack');
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  context: path.resolve('./src/client/'),
  entry: './index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve('./docs/demo')
  },
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          {
            loader: "style-loader"
          },
          {
            loader: "css-loader"
          },
          {
            loader: "sass-loader"
          }
        ]
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: require('./babelrc.js'),
      },
      {
        test: /\.html$/,
        loader: 'html-loader'
      },
    ]
  },
  plugins: [
    new CleanWebpackPlugin([
      './docs/demo/*'
    ]),
    new CopyWebpackPlugin([
      {
        from: '../client/index.html',
        to: './',
        flatten: true,
      },
      {
        from: '../client/resources/example.pdf',
        to: './',
        flatten: true,
      },
      {
        from: '../../node_modules/pdfjs-dist/web/images',
        to: './assets/images',
        flatten: true,
      }
    ]),
  ],
};
