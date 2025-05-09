const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

const createConfig = (entry, output) => ({
  target: 'node',
  mode: 'production',
  entry,
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, output),
    libraryTarget: 'commonjs2',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared/'),
    },
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  externals: ['@aws-sdk'],
});

module.exports = [
  // createConfig('./src/functions/getStock.ts', 'dist/getStock'),
  // createConfig('./src/functions/updateStock.ts', 'dist/updateStock'),
  // createConfig('./src/functions/alertStock.ts', 'dist/alertStock'),
  createConfig('./src/functions/material.ts', 'dist/material'),
  createConfig('./src/functions/stockShortage.ts', 'dist/stockShortage'),
];