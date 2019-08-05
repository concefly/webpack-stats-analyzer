import('./c');
import('./import-context-' + name + '.js');

require.context('.', false, /^require-context-lazy-.*\.js$/, 'lazy');
