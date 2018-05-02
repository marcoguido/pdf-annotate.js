var webpack = require('webpack');

module.exports = {
  entry: './src/main.js',

  output: {
    filename: 'index.js',
    path: 'dist'
  },

  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015']
        }
      }
    ]
  }
};
