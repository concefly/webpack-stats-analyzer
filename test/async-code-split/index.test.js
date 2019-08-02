const { join } = require('path');
const { createWebpackTestSuite } = require('../lib');
const { Analyser } = require('../../src/index');

createWebpackTestSuite('async-code-split', {
  entry: join(__dirname, 'fixture/index.js'),
})
  .add('getModuleTrace', statsJson => {
    const ins = new Analyser(statsJson);
    const result = [
      ...ins.getModuleTrace(
        './test/async-code-split/fixture/b.js',
        './test/async-code-split/fixture/index.js'
      ),
    ];

    expect(
      result.map(r =>
        r.map(_r => ({
          name: _r.module.name,
        }))
      )
    ).toEqual([
      [
        { name: './test/async-code-split/fixture/b.js' },
        { name: './test/async-code-split/fixture/a.js' },
        { name: './test/async-code-split/fixture/index.js' },
      ],
    ]);
  })
  .start();
