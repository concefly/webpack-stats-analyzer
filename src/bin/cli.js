#!/bin/env node

const fs = require('fs');
const { Analyser } = require('../index');
const yaml = require('js-yaml');
const program = require('commander');
const _ = require('lodash');

const createAnalyser = stats => {
  const statsJson = JSON.parse(fs.readFileSync(stats, { encoding: 'utf-8' }));
  return new Analyser(statsJson);
};

const invoke = (method, transformer, stats, ...args) => {
  const ins = createAnalyser(stats);
  let result = ins[method](...args);

  if (transformer) {
    result = transformer(result);
  }

  console.log(yaml.safeDump(result, { lineWidth: 999 }));
};

const print = data => {
  console.log(yaml.safeDump(data || null, { lineWidth: 999, skipInvalid: true }));
};

[
  {
    method: 'filterModuleByNameLike',
    description: '按名称模糊查询模块',
    transformer: result => {
      return result.map(t => ({
        ..._.pick(t, ['name', 'size']),
        ...(t.modules && {
          modules: t.modules.map(m => _.pick(m, ['name', 'size'])),
        }),
      }));
    },
  },
].forEach(item => {
  program
    .command(`${item.method} <stats> <args...>`)
    .description(item.description || '')
    .action((stats, args) => {
      if (item.parseArgs) {
        args = item.parseArgs(args);
      }

      invoke(item.method, item.transformer, stats, ...args);
    });
});

// 要定制的指令
program
  .command('getModuleTrace <stats> <a> <b>')
  .description('查找模块引用路径')
  .option('-H, --human', '可读输出')
  .action((stats, a, b, { human }) => {
    const ins = createAnalyser(stats);
    let cnt = 1;

    for (const trace of ins.getModuleTrace(a, b)) {
      const msgData = trace.map(t => {
        return {
          name: t.module.name,
          reasons: t.reasons,
        };
      });

      if (human) {
        print(msgData);
      } else {
        console.log(
          `[${cnt++}] ` +
            msgData
              .map(d => `${d.name}(types=${d.reasons.map(r => r.type).join(',')})`)
              .join(' -> ')
        );
      }
    }
  });

program.parse(process.argv);
