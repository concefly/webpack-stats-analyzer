const webpack = require('webpack');
const fs = require('fs');

const createWebpackTestSuite = (
  /** @type string */
  name,
  /** @type {{ entry: any }} */
  opt
) => {
  const caseList = [];

  const add = (
    name,
    /** @type {(stats: webpack.Stats.ToJsonOutput) => any} */
    fn
  ) => {
    caseList.push({ name, fn });
    return api;
  };

  const start = () => {
    describe(name, () => {
      let statsJson;

      beforeAll(async () => {
        const stats = await new Promise((resolve, reject) => {
          webpack(
            {
              entry: opt.entry,
              devtool: false,
              mode: 'development',
            },
            (err, stats) => {
              if (err) return reject(err);
              resolve(stats);
            }
          );
        });

        statsJson = stats.toJson({ all: true });
        fs.writeFileSync(`./dist/stats-${name}.json`, JSON.stringify(statsJson, null, 2), {
          encoding: 'utf-8',
        });
      });

      caseList.forEach(ca => {
        it(ca.name, () => {
          ca.fn(statsJson);
        });
      });
    });
  };

  const api = {
    add,
    start,
  };

  return api;
};

module.exports = { createWebpackTestSuite };
