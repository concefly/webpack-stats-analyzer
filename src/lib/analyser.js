/** @typedef {import('webpack')} webpack */
/** @typedef {import('webpack').Stats} Stats */
/** @typedef {import('webpack').Stats.ToJsonOutput} Stats.ToJsonOutput */
/** @typedef {import('webpack').Stats.FnModules} Stats.FnModules */

const _ = require('lodash');
const { Digraph } = require('flat-tree-helper/dist/lib/digraph');

class Analyser {
  constructor(statsJson) {
    if (statsJson) {
      this.setStatsJson(statsJson);
    }
  }

  _throw(msg) {
    throw new Error(msg);
  }

  setStatsJson(statsJson) {
    this.statsJson = statsJson;
    this._getModuleNameGroup = _.memoize(() => _.groupBy(this.statsJson.modules, 'name'));

    // 初始化 digraph
    const graph = [];
    this.statsJson.modules.forEach(m => {
      graph.push({
        id: m.name,
        // reasons 可能有重复的 moduleName
        nextIds: m.reasons ? _.union(m.reasons.map(r => r.moduleName)) : [],
        origin: m,
      });
    });
    this.digraph = new Digraph(graph);
  }

  getStatsJson() {
    return this.statsJson;
  }

  /**
   * @param a - 起点 id
   * @param b - 终点 id
   * @param mode - 模式(`one` | `all`)，默认 one
   */
  getModuleTrace(a, b, mode) {
    mode = mode || 'one';

    const traceList = (mode === 'one'
      ? [this.digraph.getOneTrace(a, b)]
      : this.digraph.getAllTraceList(a, b)
    ).filter(v => !!v);

    const result = traceList.map(trace => {
      return trace.map((t, index) => {
        const nextTraceItem = trace[index + 1];

        // 查找依赖原因
        /** @type {any[]} */
        const reasons = _.get(t, 'origin.reasons', []).filter(r => {
          return r.moduleName === _.get(nextTraceItem, 'origin.name');
        });

        return {
          module: t.origin,
          next: nextTraceItem && nextTraceItem.origin,
          reasons: reasons.map(r => _.pick(r, ['moduleName', 'type', 'loc'])),
        };
      });
    });

    return result;
  }

  filterModuleByNameLike(q) {
    return this.statsJson.modules.filter(m => m.name.includes(q));
  }
}

module.exports = {
  Analyser,
};
