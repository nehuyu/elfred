import webpack from 'webpack';
import merge from 'webpack-merge';
import baseConfig from './webpack.config.base';

const port = process.env.PORT || 8000;

const config = merge(baseConfig, {
  debug: true,

  devtool: 'cheap-module-eval-source-map',

  entry: [
    `webpack-hot-middleware/client?path=http://localhost:${port}/__webpack_hmr`,
    './app/index'
  ],

  output: {
    publicPath: `http://localhost:${port}/dist/`
  },

  module: {
    loaders: [
      {
        test: /\.global\.css$/,
        loaders: [
          'style-loader',
          'css-loader?sourceMap',
          'postcss-loader'
        ]
      },

      {
        test: /^((?!\.global).)*\.css$/,
        loaders: [
          'style-loader',
          'css-loader?modules&sourceMap&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]',
          'postcss-loader'
        ]
      }
    ]
  },

  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({ "global.GENTLY": false }),
    new webpack.NoErrorsPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development')
    })
  ],

  target: 'electron-renderer'
});

config.postcss = function postcss() {
  return [
    require('postcss-import'),
    require('postcss-size'),
    require('autoprefixer')({ browsers: ['last 2 versions'] }),
    require('postcss-calc')
  ];
};

export default config;
