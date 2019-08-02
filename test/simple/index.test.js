const { join } = require('path');
const { createWebpackTestSuite } = require('../lib');
const { Analyser } = require('../../src/index');
const _ = require('lodash');

createWebpackTestSuite('simple', {
  entry: join(__dirname, 'fixture/index.js'),
})
  .add('getModuleTrace', statsJson => {
    const ins = new Analyser(statsJson);
    const result = [
      ...ins.getModuleTrace('./test/simple/fixture/c.js', './test/simple/fixture/index.js'),
    ];

    expect(
      result.map(r =>
        r.map(_r => ({
          name: _r.module.name,
        }))
      )
    ).toEqual([
      [
        { name: './test/simple/fixture/c.js' },
        { name: './test/simple/fixture/a.js' },
        { name: './test/simple/fixture/index.js' },
      ],
      [
        { name: './test/simple/fixture/c.js' },
        { name: './test/simple/fixture/b.js' },
        { name: './test/simple/fixture/index.js' },
      ],
    ]);
  })
  .start();
