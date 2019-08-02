/** @typedef {import('webpack').Compiler} webpack.Compiler */
/** @typedef {import('webpack').compilation.Compilation} webpack.compilation.Compilation */

/** @type {import('./analyser').Analyser} */
const Analyser = require('./analyser').Analyser;
const { createStringTester } = require('./util');

/** @typedef {{ source: RegExp | string, target: RegExp | string }[]} IModuleNoTrace */
/** @typedef {{ moduleNoTrace: IModuleNoTrace }} IOption */

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
        this._opt.moduleNoTrace.forEach(spec => {
          for (const _ of this.moduleNoTrace(spec.source, spec.target)) {
            void 0;
          }
        });
      } catch (err) {
        return callback(err);
      }

      callback();
    });
  }

  *moduleNoTrace(a, b) {
    const aTester = createStringTester(a);
    const bTester = createStringTester(b);

    const stats = this._analyser.getStatsJson();
    const aModules = stats.modules.filter(m => aTester(m.name));
    const bModules = stats.modules.filter(m => bTester(m.name));

    for (const am of aModules) {
      for (const bm of bModules) {
        const traceIter = this._analyser.getModuleTrace(am.name, bm.name);

        // 只要找出了 trace 就报异常
        for (const trace of traceIter) {
          const traceStr = trace.map(t => t.module.name).join(' -> ');
          this._throw(`存在依赖关系: ${traceStr}`, 'moduleNoTrace');
        }
      }
    }
  }
}

module.exports = { DepDefence };
