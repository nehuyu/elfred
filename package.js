require('babel-polyfill');
const os = require('os');
const fs = require('fs');
const webpack = require('webpack');
const electronCfg = require('./webpack.config.electron');
const cfg = require('./webpack.config.production');
const packager = require('electron-packager');
const del = require('del');
const exec = require('child_process').exec;
const argv = require('minimist')(process.argv.slice(2));
const pkg = require('./package.json');

const deps = Object.keys(pkg.dependencies);
const devDeps = Object.keys(pkg.devDependencies);

const appName = argv.name || argv.n || pkg.productName;
const shouldUseAsar = argv.asar || argv.a || false;
const shouldBuildAll = argv.all || false;
const shouldBuildWin32 = argv.win32 || false;
const destDirName = 'release';


const DEFAULT_OPTS = {
  dir: './',
  name: appName,
  asar: shouldUseAsar,
  ignore: [
    '^/test($|/)',
    `^/${destDirName}($|/)`,
    '^/main.development.js'
  ].concat(devDeps.map(name => `/node_modules/${name}($|/)`))
    .concat(
      deps.filter(name => !electronCfg.externals.includes(name))
        .map(name => `/node_modules/${name}($|/)`)
    )
};

const icon = argv.icon || argv.i || 'app/app';

if (icon) {
  DEFAULT_OPTS.icon = icon;
}

const version = argv.version || argv.v;

if (version) {
  DEFAULT_OPTS.version = version;
  startPack();
} else {
  // use the same version as the currently-installed electron-prebuilt
  exec('npm list electron --dev', (err, stdout) => {
    if (err) {
      console.log(err);
      DEFAULT_OPTS.version = '1.2.0';
    } else {
      DEFAULT_OPTS.version = stdout.split('electron@')[1].replace(/\s/g, '');
    }

    startPack();
  });
}


function build(cfg) {
  return new Promise((resolve, reject) => {
    webpack(cfg, (err, stats) => {
      if (err) return reject(err);
      resolve(stats);
    });
  });
}

async function startPack() {
  console.log('start pack...');

  try {
    await build(electronCfg);
    await build(cfg);
    await del(destDirName);

    if (shouldBuildAll) {
      // build for all platforms
      const archs = ['ia32', 'x64'];
      const platforms = ['linux', 'win32', 'darwin'];

      platforms.forEach((plat) => {
        archs.forEach((arch) => {
          pack(plat, arch, log(plat, arch));
        });
      });
    } else if (shouldBuildWin32) {
      const archs = ['ia32', 'x64'];
      const platforms = ['win32'];

      platforms.forEach(plat => {
        archs.forEach(arch => {
          pack(plat, arch, afterPack(plat, arch));
        });
      });
    } else {
      // build for current platform only
      pack(os.platform(), os.arch(), afterPack(os.platform(), os.arch()));
    }
  } catch (error) {
    console.error(error);
  }
}

function pack(plat, arch, cb) {
  // there is no darwin ia32 electron
  if (plat === 'darwin' && arch === 'ia32') return;

  const iconObj = {
    icon: DEFAULT_OPTS.icon + (() => {
      let extension = '.png';
      if (plat === 'darwin') {
        extension = '.icns';
      } else if (plat === 'win32') {
        extension = '.ico';
      }
      return extension;
    })()
  };

  const opts = Object.assign({}, DEFAULT_OPTS, iconObj, {
    platform: plat,
    arch,
    prune: true,
    'app-version': pkg.version || DEFAULT_OPTS.version,
    out: `${destDirName}/${plat}-${arch}/${appName}`
  });

  packager(opts, cb);
}

function afterPack(plat, arch) {
  return (err, filepath) => {
    if (err) {
      return console.error(err);
    }
    
    log(plat, arch);
  };
}

/**
 * パッケージ完了をterminalに表示
 */
function log(plat, arch) {
  console.log(`${plat}-${arch} finished!`);
}