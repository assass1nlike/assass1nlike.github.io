const SITE_TIME_ZONE = 'Asia/Shanghai';
const QUOTE_START_DATE_KEY = '2026-05-11';
const EVERLASTING_OVERVIEW_PATH = 'everlasting.md';
const QUOTE_CSV_PATH = '/everlasting/tech/osu-get-poetry-difficulties/poetic_diffs.csv';

const CATEGORY_DEFINITIONS = {
  research: {
    id: 'research',
    title: '科研',
    heading: '正式的科研内容',
    description: '论文、实验记录与研究笔记。',
    docs: [
      'everlasting/research/recurrent_MoE.md',
      'everlasting/research/tefig.md',
      'everlasting/research/ulars.md',
    ],
  },
  permanence: {
    id: 'permanence',
    title: '开源项目',
    heading: '开源项目',
    description: '开放项目和可复用工具。',
    docs: [
      'everlasting/permanence/math-embedding.md',
    ],
  },
  invisible: {
    id: 'invisible',
    title: '学习',
    heading: '学习和思考',
    description: '阅读、经验与思考的整理。',
    docs: [
      'everlasting/invisible/desire.md',
      'everlasting/invisible/limitless.md',
    ],
  },
  tech: {
    id: 'tech',
    title: '技术',
    heading: '技术',
    description: '工程、工具和实践记录。',
    docs: [
      'everlasting/tech/osu-auto-download-import/osu-auto-download-import.md',
      'everlasting/tech/osu-get-poetry-difficulties/osu-get-poetry-difficulties.md',
    ],
  },
};

const DOC_DEFINITIONS = [
  {
    path: 'everlasting.md',
    title: 'Everlasting',
    aliases: ['everlasting', 'everlasting.md'],
    category: null,
  },
  {
    path: 'everlasting/research/recurrent_MoE.md',
    title: 'recurrent MoE',
    aliases: ['recurrent moE', 'recurrent moe', 'recurrent_MoE', 'recurrent MoE'],
    category: 'research',
  },
  {
    path: 'everlasting/research/tefig.md',
    title: 'tefig',
    aliases: ['tefig', 'tefig.md'],
    category: 'research',
  },
  {
    path: 'everlasting/research/ulars.md',
    title: 'ulars',
    aliases: ['ulars', 'ulars.md'],
    category: 'research',
  },
  {
    path: 'everlasting/permanence/math-embedding.md',
    title: 'math-embedding',
    aliases: ['math-embedding', 'math embedding', 'Math-Embedding'],
    category: 'permanence',
  },
  {
    path: 'everlasting/invisible/desire.md',
    title: 'desire',
    aliases: ['desire', 'desire.md'],
    category: 'invisible',
  },
  {
    path: 'everlasting/invisible/limitless.md',
    title: 'limitless',
    aliases: ['limitless', 'limitless.md'],
    category: 'invisible',
  },
  {
    path: 'everlasting/tech/osu-auto-download-import/osu-auto-download-import.md',
    title: 'osu-auto-download-import',
    aliases: ['osu-auto-download-import', 'osu auto download import'],
    category: 'tech',
  },
  {
    path: 'everlasting/tech/osu-get-poetry-difficulties/osu-get-poetry-difficulties.md',
    title: 'osu-get-poetry-difficulties',
    aliases: ['osu-get-poetry-difficulties', 'osu get poetry difficulties'],
    category: 'tech',
  },
];

const CATEGORY_LINK_PATTERNS = [
  { pattern: '正式的科研内容', href: categoryHref('research') },
  { pattern: '开源项目', href: categoryHref('permanence') },
  { pattern: '学习和思考', href: categoryHref('invisible') },
];

const DOC_LINK_PATTERNS = buildDocLinkPatterns();
const HOME_TEXT_PATTERNS = [...CATEGORY_LINK_PATTERNS, ...DOC_LINK_PATTERNS];

const DOC_INDEX = new Map(DOC_DEFINITIONS.map((doc) => [normalizeKey(doc.path), doc]));
const DOC_ALIAS_INDEX = new Map();
for (const doc of DOC_DEFINITIONS) {
  for (const alias of [doc.title, ...doc.aliases, basename(doc.path).replace(/\.md$/i, '')]) {
    DOC_ALIAS_INDEX.set(normalizeKey(alias), doc);
  }
}

const CATEGORY_ORDER = ['research', 'permanence', 'invisible', 'tech'];

let quoteCandidatesPromise = null;
let quotePoolPromise = null;

document.addEventListener('DOMContentLoaded', () => {
  const page = document.documentElement.dataset.page || 'home';
  if (page === 'viewer') {
    initViewerPage();
    return;
  }
  if (page === 'category') {
    initCategoryPage();
    return;
  }
  if (page === 'history') {
    initHistoryPage();
    return;
  }
  initHomePage();
});

async function initHomePage() {
  const quoteHost = document.getElementById('daily-quote');
  const quoteMeta = document.getElementById('daily-quote-meta');
  const articleHost = document.getElementById('main-article');
  const categoryNav = document.getElementById('category-nav');

  if (categoryNav) {
    categoryNav.innerHTML = CATEGORY_ORDER.map((id) => {
      const category = CATEGORY_DEFINITIONS[id];
      return `<a class="pill-link" href="${categoryHref(id)}">${escapeHtml(category.title)}</a>`;
    }).join('');
  }

  if (quoteHost) {
    try {
      const quote = await getDailyQuote();
      quoteHost.textContent = quote.text;
      if (quoteMeta) {
        quoteMeta.textContent = `${quote.dateKey} · score ${quote.score.toFixed(2)}`;
      }
    } catch (_error) {
      quoteHost.textContent = 'The quote source is temporarily unavailable.';
      if (quoteMeta) {
        quoteMeta.textContent = '';
      }
    }
  }

  if (articleHost) {
    await loadMarkdownInto(articleHost, rootAssetPath(EVERLASTING_OVERVIEW_PATH), {
      maxBlocks: 240,
      linkScope: 'home',
    });
  }
}

async function initViewerPage() {
  const url = new URL(window.location.href);
  const docInput = url.searchParams.get('doc') || EVERLASTING_OVERVIEW_PATH;
  const resolved = resolveDoc(docInput);
  const host = document.getElementById('viewer-article');
  const titleHost = document.getElementById('viewer-title');
  const subtitleHost = document.getElementById('viewer-subtitle');

  if (resolved) {
    document.title = `${resolved.title} | assassinlike`;
  }
  if (titleHost) {
    titleHost.textContent = resolved?.title || displayNameFromPath(docInput);
  }
  if (subtitleHost) {
    subtitleHost.textContent = resolved?.path || docInput;
  }
  if (host) {
    await loadMarkdownInto(host, rootAssetPath(resolved?.path || docInput), {
      maxBlocks: 600,
      linkScope: 'doc',
    });
  }
}

async function initCategoryPage() {
  const url = new URL(window.location.href);
  const categoryId = normalizeKey(url.searchParams.get('cat'));
  const category = CATEGORY_DEFINITIONS[categoryId];
  const host = document.getElementById('category-article');
  const titleHost = document.getElementById('category-title');
  const subtitleHost = document.getElementById('category-subtitle');
  const navHost = document.getElementById('category-links');

  if (!category) {
    if (host) {
      host.innerHTML = '<div class="error-state">Unknown category.</div>';
    }
    return;
  }

  document.title = `${category.title} | assassinlike`;
  if (titleHost) {
    titleHost.textContent = category.title;
  }
  if (subtitleHost) {
    subtitleHost.textContent = category.description;
  }
  if (navHost) {
    navHost.innerHTML = CATEGORY_ORDER.map((id) => {
      const item = CATEGORY_DEFINITIONS[id];
      const active = id === category.id ? ' is-active' : '';
      return `<a class="pill-link${active}" href="${categoryHref(id)}">${escapeHtml(item.title)}</a>`;
    }).join('');
  }

  if (!host) {
    return;
  }

  host.innerHTML = '<div class="loading-state">Loading category...</div>';
  const docs = await loadCategoryDocs(category);
  host.innerHTML = renderCategoryLayout(category, docs);
  enhanceMarkdownHost(host);
}

async function initHistoryPage() {
  const host = document.getElementById('history-article');
  const titleHost = document.getElementById('history-title');
  const subtitleHost = document.getElementById('history-subtitle');

  document.title = '历史浏览 | assassinlike';
  if (titleHost) {
    titleHost.textContent = '历史浏览';
  }
  if (subtitleHost) {
    subtitleHost.textContent = '每天刷新的候选记录';
  }
  if (!host) {
    return;
  }

  host.innerHTML = '<div class="loading-state">Loading history...</div>';
  try {
    const pool = await getQuotePool();
    const todayKey = getShanghaiDateKey(new Date());
    const totalDays = Math.max(0, daysBetweenKeys(QUOTE_START_DATE_KEY, todayKey));
    const items = [];

    for (let offset = 0; offset <= totalDays; offset += 1) {
      const dateKey = addDaysToKey(QUOTE_START_DATE_KEY, offset);
      const quote = pool[offset % pool.length];
      const active = dateKey === todayKey ? ' is-today' : '';
      items.push(`
        <section class="history-item${active}">
          <div class="history-date">${escapeHtml(dateKey)}</div>
          <div class="history-quote">${escapeHtml(quote.text)}</div>
          <div class="history-score">${quote.score.toFixed(2)}</div>
        </section>
      `);
    }

    host.innerHTML = `
      <div class="history-summary">
        <div class="history-summary-title">Quote history</div>
        <div class="history-summary-copy">Sequence is derived from the CSV and the Shanghai date.</div>
      </div>
      <div class="history-list">${items.join('')}</div>
    `;
  } catch (error) {
    host.innerHTML = `<div class="error-state">无法加载历史记录。<br>${escapeHtml(error.message)}</div>`;
  }
}

async function loadMarkdownInto(host, path, options = {}) {
  host.innerHTML = '<div class="loading-state">Loading markdown...</div>';
  try {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${path} (${response.status})`);
    }
    const text = await response.text();
    const html = renderMarkdown(text, options);
    host.innerHTML = html || '<div class="loading-state">No content found.</div>';
    enhanceMarkdownHost(host);
  } catch (error) {
    host.innerHTML = `<div class="error-state">无法加载 ${escapeHtml(path)}。<br>${escapeHtml(error.message)}</div>`;
  }
}

async function loadCategoryDocs(category) {
  const docs = await Promise.all(
    category.docs.map(async (path) => {
      const doc = resolveDoc(path) || {
        path,
        title: displayNameFromPath(path),
        category: category.id,
        aliases: [],
      };
      try {
        const response = await fetch(rootAssetPath(doc.path), { cache: 'no-cache' });
        if (!response.ok) {
          throw new Error(`Failed to fetch ${doc.path} (${response.status})`);
        }
        const text = await response.text();
        const preview = renderMarkdown(text, {
          maxBlocks: 4,
          linkScope: 'doc',
        });
        return {
          ...doc,
          preview,
          missing: false,
        };
      } catch (_error) {
        return {
          ...doc,
          preview: '<div class="loading-state">Preview unavailable.</div>',
          missing: true,
        };
      }
    }),
  );

  return docs;
}

function renderCategoryLayout(category, docs) {
  const cards = docs.map((doc) => {
    const missingClass = doc.missing ? ' is-missing' : '';
    return `
      <article class="doc-card${missingClass}">
        <div class="doc-card-head">
          <div>
            <div class="doc-card-title">
              <a class="doc-link" href="${viewerHref(doc.path)}">${escapeHtml(doc.title)}</a>
            </div>
            <div class="doc-card-meta">${escapeHtml(category.title)} · ${escapeHtml(basename(doc.path))}</div>
          </div>
          <a class="icon-link doc-open" href="${viewerHref(doc.path)}">Open ↗</a>
        </div>
        <div class="doc-card-body markdown-body">${doc.preview}</div>
      </article>
    `;
  }).join('');

  return `
    <section class="category-intro">
      <div class="category-intro-title">${escapeHtml(category.title)}</div>
      <div class="category-intro-copy">${escapeHtml(category.description)}</div>
    </section>
    <section class="doc-card-list">${cards}</section>
  `;
}

function renderMarkdown(source, options = {}) {
  const lines = normalizeLineBreaks(source).split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    if (options.maxBlocks && blocks.length >= options.maxBlocks) {
      blocks.push('<p class="preview-ellipsis">...</p>');
      break;
    }

    const raw = lines[i];
    const line = raw.trimEnd();
    const compact = line.trim();

    if (!compact || compact === '[TOC]') {
      i += 1;
      continue;
    }

    if (/^```/.test(compact)) {
      const fence = compact.slice(0, 3);
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) {
        code.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) {
        i += 1;
      }
      blocks.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    if (isHeading(compact)) {
      const match = compact.match(/^(#{1,6})\s+(.*)$/);
      const level = match[1].length;
      const text = match[2].trim();
      blocks.push(`<h${level} id="${slugify(text)}">${parseInline(text)}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^---+$/.test(compact)) {
      blocks.push('<hr>');
      i += 1;
      continue;
    }

    if (/^>\s?/.test(compact)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push(`<blockquote>${paragraphify(quote)}</blockquote>`);
      continue;
    }

    if (isListItem(compact)) {
      const ordered = /^\d+\.\s+/.test(compact);
      const tag = ordered ? 'ol' : 'ul';
      const items = [];

      while (i < lines.length && isListItem(lines[i].trim())) {
        const itemLines = [];
        let current = lines[i].replace(/^\s*(?:[-*+]|\d+\.)\s+/, '');
        itemLines.push(current);
        i += 1;

        while (i < lines.length && lines[i].trim() && !isBlockBoundary(lines[i].trim())) {
          if (/^\s{2,}\S/.test(lines[i]) || lines[i].startsWith('\t')) {
            itemLines.push(lines[i].trim());
            i += 1;
          } else {
            break;
          }
        }

        items.push(`<li>${paragraphify(itemLines)}</li>`);
      }

      blocks.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    const paragraphLines = [line];
    i += 1;

    while (i < lines.length) {
      const next = lines[i];
      const nextTrim = next.trim();
      if (!nextTrim || nextTrim === '[TOC]' || isBlockBoundary(nextTrim)) {
        break;
      }
      paragraphLines.push(next);
      i += 1;
    }

    blocks.push(`<p>${paragraphify(paragraphLines)}</p>`);
  }

  const body = blocks.join('\n');
  const scope = options.linkScope || 'none';
  const patterns = buildTextPatterns(scope);
  return patterns.length ? autoLinkText(body, patterns) : body;
}

function paragraphify(lines) {
  const text = lines.map((line) => line.trimEnd()).join('\n');
  return parseInline(text);
}

function parseInline(text) {
  const placeholders = [];
  let working = String(text);

  working = working.replace(/<a\s+id=(['"])([^'"]+)\1\s*><\/a>/gi, (_, _quote, id) => {
    const token = `__ANCHOR_${placeholders.length}__`;
    placeholders.push(`<a id="${escapeHtml(id)}"></a>`);
    return token;
  });

  working = working.replace(/`([^`]+)`/g, (_, code) => {
    const token = `__CODE_${placeholders.length}__`;
    placeholders.push(`<code>${escapeHtml(code)}</code>`);
    return token;
  });

  working = escapeHtml(working);
  working = working.replace(/\n/g, '<br>');

  working = working.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const cleanSrc = src.trim();
    const altText = alt.trim();
    return `<figure class="md-image"><img src="${escapeAttr(cleanSrc)}" alt="${escapeAttr(altText)}" loading="lazy" decoding="async" onerror="this.parentElement.remove()">${altText ? `<figcaption>${altText}</figcaption>` : ''}</figure>`;
  });

  working = working.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const resolved = resolveLinkHref(href.trim());
    const external = isExternalUrl(resolved);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    const className = resolved.includes('category.html') || resolved.includes('viewer.html') || resolved.includes('secret.html') ? 'doc-link' : '';
    return `<a class="${className}" href="${escapeAttr(resolved)}"${attrs}>${label.trim()}</a>`;
  });

  working = working.replace(/\$\$([^$]+)\$\$/g, '<span class="math-block">$1</span>');
  working = working.replace(/\$([^$\n]+)\$/g, '<span class="math">$1</span>');
  working = working.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  working = working.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  working = working.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  working = working.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  working = working.replace(/__ANCHOR_(\d+)__/g, (_, index) => placeholders[Number(index)] || '');
  working = working.replace(/__CODE_(\d+)__/g, (_, index) => placeholders[Number(index)] || '');
  return working;
}

function buildTextPatterns(scope) {
  if (scope === 'home') {
    return HOME_TEXT_PATTERNS;
  }
  if (scope === 'doc' || scope === 'preview') {
    return DOC_LINK_PATTERNS;
  }
  return [];
}

function buildDocLinkPatterns() {
  const patterns = [];
  for (const doc of DOC_DEFINITIONS) {
    const variants = new Set([
      doc.title,
      basename(doc.path).replace(/\.md$/i, ''),
      ...doc.aliases,
    ]);
    for (const pattern of variants) {
      if (!pattern) continue;
      patterns.push({
        pattern,
        href: viewerHref(doc.path),
      });
    }
  }
  patterns.sort((a, b) => b.pattern.length - a.pattern.length);
  return patterns;
}

function autoLinkText(html, patterns) {
  const container = document.createElement('div');
  container.innerHTML = html;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  const skipTags = new Set(['A', 'CODE', 'PRE', 'SCRIPT', 'STYLE', 'TEXTAREA']);

  let node;
  while ((node = walker.nextNode())) {
    const parentTag = node.parentElement?.tagName;
    if (!parentTag || skipTags.has(parentTag)) {
      continue;
    }
    textNodes.push(node);
  }

  for (const textNode of textNodes) {
    const original = textNode.nodeValue;
    if (!original || !original.trim()) {
      continue;
    }

    const fragment = document.createDocumentFragment();
    let cursor = 0;

    while (cursor < original.length) {
      let best = null;
      let bestIndex = -1;

      for (const entry of patterns) {
        const index = original.indexOf(entry.pattern, cursor);
        if (index === -1) {
          continue;
        }
        if (
          bestIndex === -1 ||
          index < bestIndex ||
          (index === bestIndex && entry.pattern.length > best.pattern.length)
        ) {
          best = entry;
          bestIndex = index;
        }
      }

      if (!best) {
        fragment.appendChild(document.createTextNode(original.slice(cursor)));
        break;
      }

      if (bestIndex > cursor) {
        fragment.appendChild(document.createTextNode(original.slice(cursor, bestIndex)));
      }

      const anchor = document.createElement('a');
      anchor.className = 'doc-link';
      anchor.href = best.href;
      anchor.textContent = original.slice(bestIndex, bestIndex + best.pattern.length);
      fragment.appendChild(anchor);
      cursor = bestIndex + best.pattern.length;
    }

    textNode.parentNode.replaceChild(fragment, textNode);
  }

  return container.innerHTML;
}

function enhanceMarkdownHost(host) {
  host.querySelectorAll('img').forEach((img) => {
    img.loading = 'lazy';
    img.decoding = 'async';
  });
  host.querySelectorAll('a').forEach((anchor) => {
    const href = anchor.getAttribute('href') || '';
    if (isExternalUrl(href)) {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

function resolveDoc(input) {
  const normalized = normalizeKey(input);
  return DOC_INDEX.get(normalized) || DOC_ALIAS_INDEX.get(normalized) || null;
}

function resolveLinkHref(href) {
  const trimmed = String(href || '').trim();
  if (isExternalUrl(trimmed) || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return trimmed;
  }

  const doc = resolveDoc(trimmed);
  if (doc) {
    return viewerHref(doc.path);
  }

  const category = resolveCategory(trimmed);
  if (category) {
    return categoryHref(category.id);
  }

  return trimmed;
}

function isExternalUrl(href) {
  const value = String(href || '').trim();
  if (!value) {
    return false;
  }
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value);
}

function resolveCategory(input) {
  const normalized = normalizeKey(input);
  if (!normalized) {
    return null;
  }
  return CATEGORY_DEFINITIONS[normalized] || Object.values(CATEGORY_DEFINITIONS).find((item) => {
    return normalizeKey(item.title) === normalized || normalizeKey(item.heading) === normalized;
  }) || null;
}

function categoryHref(categoryId) {
  return `/category.html?cat=${encodeURIComponent(categoryId)}`;
}

function viewerHref(docPath) {
  return `/viewer.html?doc=${encodeURIComponent(docPath)}`;
}

function rootAssetPath(path) {
  const value = String(path || '').replace(/^[./]+/, '');
  return `/${value}`;
}

function getDailyQuote() {
  return getQuoteForDate(new Date());
}

async function getQuotePool() {
  if (!quotePoolPromise) {
    quotePoolPromise = loadQuotePool();
  }
  return quotePoolPromise;
}

async function loadQuotePool() {
  if (!quoteCandidatesPromise) {
    quoteCandidatesPromise = fetch(QUOTE_CSV_PATH, { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch csv (${response.status})`);
        }
        return response.text();
      })
      .then((text) => buildQuoteCandidates(text));
  }

  const candidates = await quoteCandidatesPromise;
  if (!candidates.length) {
    throw new Error('No quote candidates found.');
  }

  return createDeterministicPermutation(candidates);
}

async function getDailyQuoteRecord(date = new Date()) {
  const pool = await getQuotePool();
  const dateKey = getShanghaiDateKey(date);
  const dayIndex = daysBetweenKeys(QUOTE_START_DATE_KEY, dateKey);
  const safeIndex = mod(dayIndex, pool.length);
  return {
    dateKey,
    ...pool[safeIndex],
  };
}

function getQuoteForDate(date) {
  return getDailyQuoteRecord(date);
}

function buildQuoteCandidates(csvText) {
  const rows = parseCsv(csvText);
  if (!rows.length) {
    return [];
  }

  const header = rows[0].map((cell) => cell.trim());
  const scoreIndex = header.indexOf('score');
  const cleanedIndex = header.indexOf('cleaned');
  const versionIndex = header.indexOf('version');
  const titleIndex = header.indexOf('title');
  const creatorIndex = header.indexOf('creator');
  const setIndex = header.indexOf('set_id');
  const diffIndex = header.indexOf('diff_id');

  const seen = new Set();
  const candidates = [];

  for (const row of rows.slice(1)) {
    if (!row.length) continue;
    const score = Number(row[scoreIndex] ?? '');
    const cleaned = String(row[cleanedIndex] ?? '').trim();
    if (!cleaned || Number.isNaN(score) || score <= 9) {
      continue;
    }

    const dedupeKey = normalizeQuoteKey(cleaned);
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    candidates.push({
      text: cleaned,
      score,
      version: String(row[versionIndex] ?? ''),
      title: String(row[titleIndex] ?? ''),
      creator: String(row[creatorIndex] ?? ''),
      setId: String(row[setIndex] ?? ''),
      diffId: String(row[diffIndex] ?? ''),
    });
  }

  return candidates;
}

function createDeterministicPermutation(items) {
  const pool = items.slice();
  const seedSource = pool.map((item) => `${item.text}|${item.score}|${item.version}|${item.diffId}`).join('\n');
  let seed = hashString(seedSource || 'assassinlike');

  for (let i = pool.length - 1; i > 0; i -= 1) {
    seed = nextSeed(seed);
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let i = 0;
  let inQuotes = false;
  const input = String(text || '').replace(/^\uFEFF/, '');

  while (i < input.length) {
    const char = input[i];
    const next = input[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ',') {
      row.push(cell);
      cell = '';
      i += 1;
      continue;
    }

    if (char === '\r') {
      i += 1;
      continue;
    }

    if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i += 1;
      continue;
    }

    cell += char;
    i += 1;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function normalizeLineBreaks(text) {
  return String(text || '').replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
}

function isHeading(line) {
  return /^#{1,6}\s+/.test(line);
}

function isListItem(line) {
  return /^\s*(?:[-*+]|\d+\.)\s+/.test(line);
}

function isBlockBoundary(line) {
  return !line || line === '[TOC]' || isHeading(line) || /^\s*>\s?/.test(line) || /^```/.test(line) || /^---+$/.test(line) || isListItem(line);
}

function normalizeQuoteKey(text) {
  return String(text || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function getShanghaiDateKey(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SITE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function daysBetweenKeys(startKey, endKey) {
  const start = dateKeyToUtcMs(startKey);
  const end = dateKeyToUtcMs(endKey);
  return Math.floor((end - start) / 86400000);
}

function addDaysToKey(key, offset) {
  const date = new Date(dateKeyToUtcMs(key) + offset * 86400000);
  return getShanghaiDateKey(date);
}

function dateKeyToUtcMs(key) {
  const [year, month, day] = String(key).split('-').map((value) => Number(value));
  return Date.UTC(year, month - 1, day);
}

function mod(value, divisor) {
  if (!divisor) {
    return 0;
  }
  return ((value % divisor) + divisor) % divisor;
}

function basename(path) {
  const clean = String(path || '').split(/[?#]/)[0];
  return clean.split('/').pop() || clean;
}

function displayNameFromPath(path) {
  const base = basename(path).replace(/\.md$/i, '');
  return base.replace(/[_-]+/g, ' ').trim() || 'document';
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/\.md$/i, '')
    .replace(/[^a-z0-9]+/g, '');
}

function slugify(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function hashString(input) {
  let hash = 0;
  const text = String(input || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function nextSeed(seed) {
  let x = seed || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return Math.abs(x);
}
