const createIteratorDriver = (/** @type {"setTimeout"} */ scheduler) => (
  /** @type {IterableIterator} */ iter,
  done
) => {
  let driver;

  if (scheduler === 'setTimeout') {
    driver = () => {
      const r = iter.next();
      // if (r.done)
    };
  }
};

const createStringTester = (/** @type {Function | RegExp | string } */ spec) => {
  if (typeof spec === 'string') return s => s && s.includes(spec);
  if (typeof spec === 'function') return s => spec(s);
  if (spec.exec && spec.test) return s => spec.test(s);

  return () => false;
};

module.exports = { createStringTester };
