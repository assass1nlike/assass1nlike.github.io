const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const root = resolve(__dirname, '..');
function loadCatalog(extra = []) {
  const context = vm.createContext({
    window: { addEventListener() {} },
    document: { addEventListener() {} },
    localStorage: { getItem() { return null; } },
  });
  vm.runInContext(readFileSync(resolve(root, 'assets/articles/catalog.js'), 'utf8'), context);
  context.window.ArticleCatalog.push(...extra);
  vm.runInContext(readFileSync(resolve(root, 'script.js'), 'utf8'), context);
  return { context, evaluate: (code) => vm.runInContext(code, context) };
}

test('all published categories and reader links use the generated catalog', () => {
  const { context, evaluate } = loadCatalog();
  for (const id of ['invisible', 'minors', 'tech']) {
    const paths = context.window.ArticleCatalog.filter(doc => doc.category === id).map(doc => doc.path);
    assert.deepEqual(Array.from(evaluate(`CATEGORY_DEFINITIONS.${id}.docs`)), Array.from(paths));
    for (const path of paths) {
      assert.ok(existsSync(resolve(root, path)), `Missing public article: ${path}`);
      assert.equal(context.resolveDoc(path).path, path);
      assert.match(context.resolveDoc(path).publishedAt, /^\d{4}-\d{2}-\d{2}$/);
    }
  }
  assert.equal(context.resolveDoc('newton-residual-gradient').path, 'everlasting/invisible/notes/newton-residual-gradient.md');
  assert.equal(context.resolveDoc('preliminaries').title, '补一些非常basic的知识');
  assert.equal(evaluate('CATEGORY_DEFINITIONS.invisible.docs.at(-1)'), 'everlasting/invisible/preliminaries.md');
  assert.equal(context.resolveDoc('2025.md').collection, 'annual');
  assert.equal(context.categoryHref('annual'), '/category.html?cat=minors&collection=annual');
  assert.equal(context.resolveDoc('everlasting/tech/std/claude_web_tool_issues.md').category, 'tech');
  assert.ok(!evaluate('DOC_LINK_PATTERNS').some(entry => /^202[345]$/.test(entry.pattern)));
  assert.ok(!context.window.ArticleCatalog.some(doc => /research\/|minors\/(cybergym|recurrent_MoE|4dim-bench)\//.test(doc.path)));
});

test('public IDs remain unambiguous when other articles have the same filename', () => {
  const { context } = loadCatalog([
    { path: 'everlasting/invisible/notes/nested/newton-residual-gradient.md', title: 'Another article',
      category: 'invisible', aliases: [], publicId: 'nested/newton-residual-gradient' },
  ]);
  assert.equal(context.resolveDoc('newton-residual-gradient').path, 'everlasting/invisible/notes/newton-residual-gradient.md');
  assert.equal(context.resolveDoc('nested/newton-residual-gradient').title, 'Another article');
});

test('each page loads the generated catalog before the shared site script', () => {
  for (const page of ['index.html', 'category.html', 'viewer.html', 'history.html', 'friends.html']) {
    const html = readFileSync(resolve(root, page), 'utf8');
    const catalog = html.indexOf('src="/assets/articles/catalog.js');
    assert.ok(catalog >= 0 && catalog < html.indexOf('src="/script.js'), page);
    assert.ok(!html.includes('/assets/tech/catalog.js'));
  }
});
