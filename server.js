import express from 'express';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';

import config from './webpack.config.development';

const app = express();
const compiler = webpack(config);
const PORT = process.env.PORT || 8000;

const wdm = webpackDevMiddleware(compiler, {
  publicPath: config.output.publicPath,
  stats: {
    colors: true,
    hash: false,
    timings: false,
    chunks: false,
    chunkModules: false,
    modules: false, // reduce log
    children: true,
    version: true,
    cached: true,
    cachedAssets: true,
    reasons: true,
    source: true,
    errorDetails: true
  }
});

app.use(wdm);

app.use(webpackHotMiddleware(compiler));

const server = app.listen(PORT, 'localhost', err => {
  if (err) {
    console.error(err);
    return;
  }

  console.log(`Listening at http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('Stopping dev server');
  wdm.close();
  server.close(() => {
    process.exit(0);
  });
});
