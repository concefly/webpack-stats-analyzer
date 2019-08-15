const { join } = require('path');
const { build } = require('../lib');
const { Analyser } = require('../../src/lib/analyser');
const { DepDefence } = require('../../src/lib/DepDefence');

const entry = join(__dirname, 'fixture/index.js');

describe('Analyser', () => {
  const analyser = new Analyser();

  beforeAll(async () => {
    const { statsJson } = await build({ entry });
    analyser.setStatsJson(statsJson);
  });

  it('getModuleTrace', () => {
    const result = [
      ...analyser.getModuleTrace('./test/simple/fixture/c.js', './test/simple/fixture/index.js'),
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
  });
});

describe('DepDefence', () => {
  const pluginTestBuild = async opt => {
    return build({
      entry,
      plugins: [new DepDefence(opt)],
    }).catch(error => ({ error }));
  };

  describe('moduleNoTrace', () => {
    it('normal', async () => {
      let { error } = await pluginTestBuild({
        moduleNoTrace: [
          {
            source: './test/simple/fixture/c.js',
            target: './test/simple/fixture/index.js',
          },
        ],
      });

      expect(error.message).toContain('moduleNoTrace');
    });

    it('批量 source 检查', async () => {
      let { error } = await pluginTestBuild({
        moduleNoTrace: [
          {
            source: /(a|b|c)\.js$/,
            target: /index\.js$/,
          },
        ],
      });

      expect(error.message).toContain('moduleNoTrace');
    });

    it('批量 target 检查', async () => {
      let { error } = await pluginTestBuild({
        moduleNoTrace: [
          {
            source: /a\.js$/,
            target: /(index|b)\.js$/,
          },
        ],
      });

      expect(error.message).toContain('moduleNoTrace');
    });
  });

  describe('moduleOnlyAsyncTrace', () => {
    it('存在同步引用关系会报错', async () => {
      let { error } = await pluginTestBuild({
        moduleOnlyAsyncTrace: [
          {
            source: './test/simple/fixture/c.js',
            target: './test/simple/fixture/index.js',
          },
        ],
      });
      expect(error.message).toContain('moduleOnlyAsyncTrace');
    });

    it('只有 import() 引用关系不报错', async () => {
      let { error } = await pluginTestBuild({
        moduleOnlyAsyncTrace: [
          {
            source: './test/simple/fixture/c.js',
            target: './test/simple/fixture/b.js',
          },
        ],
      });
      expect(error).toBeFalsy();
    });

    it('只有 import() context 异步引用关系不报错', async () => {
      let { error } = await pluginTestBuild({
        moduleOnlyAsyncTrace: [
          {
            source: './test/simple/fixture/import-context-x.js',
            target: './test/simple/fixture/b.js',
          },
        ],
      });
      expect(error).toBeFalsy();
    });

    it('只有 request lazy context 异步引用关系不报错', async () => {
      let { error } = await pluginTestBuild({
        moduleOnlyAsyncTrace: [
          {
            source: 'require-context-lazy-',
            target: 'b.js',
          },
        ],
      });
      expect(error).toBeFalsy();
    });

    it('没有引用关系不报错', async () => {
      let { error } = await pluginTestBuild({
        moduleOnlyAsyncTrace: [
          {
            source: './test/simple/fixture/a.js',
            target: './test/simple/fixture/b.js',
          },
        ],
      });
      expect(error).toBeFalsy();
    });
  });
});
