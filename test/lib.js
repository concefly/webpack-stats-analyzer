const webpack = require('webpack');
const fs = require('fs');
const wm = require('webpack-merge');

async function build(/** @type {webpack.Configuration} */ config) {
  const outputPath = fs.mkdtempSync('/tmp/');
  const finalConfig = wm(
    {
      output: {
        path: outputPath,
      },
      devtool: false,
      mode: 'development',
    },
    config
  );

  const stats = await new Promise((resolve, reject) => {
    webpack(finalConfig, (err, stats) => {
      if (err) return reject(err);
      resolve(stats);
    });
  });

  const statsJson = stats.toJson({ source: false });

  return { finalConfig, stats, statsJson, outputPath };
}

module.exports = { build };
