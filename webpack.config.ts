/* eslint-disable @typescript-eslint/no-require-imports */
// noinspection ES6ConvertRequireIntoImport

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin')
const webpack = require("webpack")

const DefinePlugin = webpack.DefinePlugin;
const ProvidePlugin = webpack.ProvidePlugin;

const development_mode = process.env.NODE_ENV == "development"

/**
 * @type {import("webpack").Configuration}
 */
module.exports = {
  //tell webpack where to look for source files
  context: path.resolve(__dirname, 'src'),
  entry: {
    index: './index.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    // library means that the exports from the entry file can be accessed from outside, in this case from the global scope as window.vos
    library: {type: 'umd', name: 'vos'},
  },
  devtool: false,
  mode: development_mode ? "development" : "production",
  // prevent webpack from bundling these imports (alt1 libs can use them when running in nodejs)
  externals: ['sharp', 'canvas', 'electron/common'],
  resolve: {
    extensions: ['.wasm', '.tsx', '.ts', '.mjs', '.jsx', '.js'],
    fallback: {
      "timers": false,
      "assert": require.resolve("assert"),
      "stream": false,
      "crypto": false,
      "util": false,
      "https": false,
      "http": false,
      "tls": false,
      "net": false,
      "url": false,
      "zlib": false,
      "querystring": false,
      "fs": false,
      "path": false,
      "child_process": false,
      "os": false,
      "buffer": require.resolve("buffer/"),
      "process": require.resolve("process"),
    },
    modules: [
      path.resolve('./node_modules'),
      path.resolve('./src')
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{
        from: path.resolve(__dirname, "./static")
      }]
    }),
    new ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    }),
    new DefinePlugin({
      'process.env.DEV_MODE': JSON.stringify(development_mode)
    }),
  ],
  module: {
    // The rules section tells webpack what to do with different file types when you import them from js/ts
    rules: [
      {test: /\.tsx?$/, loader: 'ts-loader'},
      {test: /\.css$/, use: ['style-loader', 'css-loader']},
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      // type:"asset" means that webpack copies the file and gives you an url to them when you import them from js
      {
        test: /\.(png|jpg|jpeg|gif|webp)$/,
        type: 'asset/resource',
        generator: {filename: '[base]'},
      },
      {
        test: /\.(html|json)$/,
        type: 'asset/resource',
        generator: {filename: '[base]'},
      },
      // file types useful for writing alt1 apps, make sure these two loader come after any other json or png loaders, otherwise they will be ignored
      {
        test: /\.data\.png$/,
        loader: 'alt1/imagedata-loader',
        type: 'javascript/auto',
      },
      {test: /\.fontmeta.json/, loader: 'alt1/font-loader'},
    ],
  },
  optimization: {
    minimize: !development_mode
  }
}