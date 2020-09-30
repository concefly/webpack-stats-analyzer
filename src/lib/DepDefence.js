/** @typedef {import('webpack').Compiler} webpack.Compiler */
/** @typedef {import('webpack').compilation.Compilation} webpack.compilation.Compilation */

/** @type {import('./analyser').Analyser} */
const Analyser = require('./analyser').Analyser;
const { createStringTester } = require('./util');

/** @typedef {{ source: RegExp | string, target: RegExp | string }[]} IModuleNoTrace */
/** @typedef {{ source: RegExp | string, target: RegExp | string }[]} IModuleOnlyAsyncTrace */
/** @typedef {{ moduleNoTrace: IModuleNoTrace, moduleOnlyAsyncTrace: IModuleOnlyAsyncTrace }} IOption */

class DepDefence {
  constructor(/** @type {IOption} */ opt) {
    this._opt = opt;

    /** @type {import('./analyser').Analyser} */
    this._analyser = new Analyser(null);
  }

  _throw(msg, analyserType) {
    const err = new Error(`[DepDefence][${analyserType}] ${msg}`);

    // 指定 type 表示是依赖分析结果的报错
    err.type = 'DepDefence';

    throw err;
  }

  _humanizeTrace(trace) {
    const str = trace
      .map(t => `${t.module.name}(${t.reasons.map(r => r.type).join(',')})`)
      .join(' -> ');

    return str;
  }

  apply(/** @type {webpack.Compiler} */ compiler) {
    compiler.hooks.afterEmit.tapAsync('DepDefence', (
      /** @type {webpack.compilation.Compilation} */ compilation,
      /** @type {Function} */ callback
    ) => {
      const stats = compilation.getStats();
      const statsJson = stats.toJson({ source: false, errors: false, warnings: false });

      // 初始化分析器
      this._analyser.setStatsJson(statsJson);

      // 调用各自的策略
      try {
        if (this._opt.moduleNoTrace) {
          this._opt.moduleNoTrace.forEach(spec => {
            this.moduleNoTrace(spec.source, spec.target);
          });
        }

        if (this._opt.moduleOnlyAsyncTrace) {
          this._opt.moduleOnlyAsyncTrace.forEach(spec => {
            this.moduleOnlyAsyncTrace(spec.source, spec.target);
          });
        }
      } catch (err) {
        return callback(err);
      }

      callback();
    });
  }

  moduleNoTrace(a, b) {
    const aTester = createStringTester(a);
    const bTester = createStringTester(b);

    const stats = this._analyser.getStatsJson();
    const aModules = stats.modules.filter(m => aTester(m.name));
    const bModules = stats.modules.filter(m => bTester(m.name));

    for (const am of aModules) {
      for (const bm of bModules) {
        const traceList = this._analyser.getModuleTrace(am.name, bm.name);
        if (traceList.length === 0) continue;

        // 只要找出了 trace 就报异常
        const traceStr = this._humanizeTrace(traceList[0]);
        this._throw(`存在依赖关系: ${traceStr}`, 'moduleNoTrace');
      }
    }
  }

  moduleOnlyAsyncTrace(a, b) {
    const aTester = createStringTester(a);
    const bTester = createStringTester(b);

    const stats = this._analyser.getStatsJson();
    const aModules = stats.modules.filter(m => aTester(m.name));
    const bModules = stats.modules.filter(m => bTester(m.name));

    try {
      for (const am of aModules) {
        for (const bm of bModules) {
          const traceIter = this._analyser.getModuleTrace(am.name, bm.name, 'all');

          for (const trace of traceIter) {
            const traceForTest = [...trace];
            traceForTest.pop();

            const isAsyncTrace = traceForTest.some(t => {
              // 类似 import('./a.js')
              const isAsyncImport = t.reasons.every(r => r.type.includes('import()'));

              // 类似 require.context(..., 'lazy')
              const isRequireContextLazy =
                t.module.name.includes(' lazy ') &&
                t.reasons.every(r => r.type.includes('require.context'));

              return isAsyncImport || isRequireContextLazy;
            });

            // 若找到非 async trace，就记录下来，并退出多重循环
            if (!isAsyncTrace) {
              const err = new Error('fake');
              err.syncTrace = trace;
              throw err;
            }
          }
        }
      }
    } catch (err) {
      // 如果是 syncTrace 异常，则 this._throw
      if (err.syncTrace) {
        const traceStr = this._humanizeTrace(err.syncTrace);
        return this._throw(`存在同步依赖关系: ${traceStr}`, 'moduleOnlyAsyncTrace');
      }

      throw err;
    }
  }
}

module.exports = { DepDefence };
