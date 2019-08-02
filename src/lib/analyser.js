/** @typedef {import('webpack')} webpack */
/** @typedef {import('webpack').Stats} Stats */
/** @typedef {import('webpack').Stats.ToJsonOutput} Stats.ToJsonOutput */
/** @typedef {import('webpack').Stats.FnModules} Stats.FnModules */

const _ = require('lodash');
const digraph = require('flat-tree-helper/dist/lib/digraph');

/**
 * @typedef {{ setStatsJson, getStatsJson, filterModuleByNameLike, getModuleTrace }} Analyser
 */
class Analyser {
  constructor(statsJson) {
    /** @type { Stats.ToJsonOutput } */
    this.statsJson = statsJson;

    this._getModuleNameGroup = _.memoize(() => _.groupBy(this.statsJson.modules, 'name'));
  }

  _throw(msg) {
    throw new Error(msg);
  }

  setStatsJson(statsJson) {
    this.statsJson = statsJson;
  }

  getStatsJson() {
    return this.statsJson;
  }

  *getModuleTrace(a, b) {
    const graph = [];
    this.statsJson.modules.forEach(m => {
      graph.push({
        id: m.name,
        // reasons 可能有重复的 moduleName
        nextIds: m.reasons ? _.union(m.reasons.map(r => r.moduleName)) : [],
        origin: m,
      });
    });

    const generator = digraph.getAllTraceGenerator(graph, a, b);

    // 转换 trace，补充信息
    for (const trace of generator) {
      yield trace.map((traceItem, index) => {
        const nextTraceItem = trace[index + 1];

        // 查找依赖原因
        /** @type {any[]} */
        const reasons = _.get(traceItem, 'origin.reasons', []).filter(r => {
          return r.moduleName === _.get(nextTraceItem, 'origin.name');
        });

        return {
          module: traceItem.origin,
          next: nextTraceItem && nextTraceItem.origin,
          reasons: reasons.map(r => _.pick(r, ['moduleName', 'type', 'loc'])),
        };
      });
    }
  }

  filterModuleByNameLike(q) {
    return this.statsJson.modules.filter(m => m.name.includes(q));
  }
}

module.exports = {
  Analyser,
};
