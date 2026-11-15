/* One search box for every section: opens with Ctrl+K or "/", loads the index on first use. */
window.SiteSearch = (() => {
  const KINDS = {
    papers: '论文阅读', invisible: '学习积累', tech: '技术杂记',
    experience: '项目经历', experiments: '实验记录', minors: 'AI/ML/CS 之外',
  };
  const LIMIT = 40;
  let indexPromise;
  let dialog;
  let input;
  let results;
  let status;
  let matches = [];
  let active = 0;

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/assets/search-index.js';
        script.onload = () => resolve(window.SiteSearchIndex?.entries || []);
        script.onerror = () => { indexPromise = null; reject(new Error('搜索索引加载失败')); };
        document.head.append(script);
      });
    }
    return indexPromise;
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function mark(text, words) {
    if (!words.length) return escapeHtml(text);
    return text.split(new RegExp('(' + words.map(escapeRegExp).join('|') + ')', 'gi'))
      .map((part, i) => (i % 2 ? '<mark>' + escapeHtml(part) + '</mark>' : escapeHtml(part))).join('');
  }

  function search(entries, query) {
    const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const scored = [];
    for (const entry of entries) {
      const title = entry.title.toLocaleLowerCase();
      const text = entry.text.toLocaleLowerCase();
      let score = 0;
      let ok = true;
      for (const word of words) {
        const inTitle = title.includes(word);
        if (!inTitle && !text.includes(word)) { ok = false; break; }
        // A whole-word hit in the title beats a prefix, which beats a body-only mention.
        score += inTitle ? (title === word ? 6 : 3) : 1;
      }
      if (ok) scored.push({ entry, score });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, LIMIT).map((item) => item.entry);
  }

  function render(query) {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    matches = search(window.SiteSearchIndex?.entries || [], query);
    active = 0;
    status.textContent = query.trim() ? (matches.length ? `${matches.length} 条结果` : '没有匹配的内容') : '输入关键词';
    results.innerHTML = matches.map((entry, i) => `
      <a class="site-search-hit${i === 0 ? ' is-active' : ''}" href="${escapeAttr(entry.href)}" data-index="${i}">
        <span class="site-search-kind">${escapeHtml(KINDS[entry.kind] || entry.kind)}</span>
        <span class="site-search-title">${mark(entry.title, words)}</span>
        ${entry.text ? `<span class="site-search-text">${mark(entry.text.slice(0, 120), words)}</span>` : ''}
      </a>`).join('');
  }

  function move(step) {
    if (!matches.length) return;
    active = (active + step + matches.length) % matches.length;
    results.querySelectorAll('.site-search-hit').forEach((hit, i) => hit.classList.toggle('is-active', i === active));
    results.querySelector('.site-search-hit.is-active')?.scrollIntoView({ block: 'nearest' });
  }

  function close() {
    dialog.close();
    dialog.classList.remove('is-open');
  }

  function build() {
    dialog = document.createElement('dialog');
    dialog.className = 'site-search';
    dialog.setAttribute('data-site-ui', '');
    dialog.innerHTML = `
      <div class="site-search-head">
        <input type="text" class="site-search-input" placeholder="搜索全部内容" aria-label="搜索全部内容" autocomplete="off">
        <button type="button" class="site-search-close" aria-label="关闭搜索">Esc</button>
      </div>
      <div class="site-search-status" role="status" aria-live="polite"></div>
      <div class="site-search-results" role="listbox"></div>`;
    document.body.append(dialog);
    input = dialog.querySelector('input');
    results = dialog.querySelector('.site-search-results');
    status = dialog.querySelector('.site-search-status');
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
      else if (event.key === 'Enter') {
        const hit = results.querySelector('.site-search-hit.is-active');
        if (hit) { event.preventDefault(); location.href = hit.getAttribute('href'); }
      }
    });
    dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
    dialog.addEventListener('cancel', () => dialog.classList.remove('is-open'));
    status.textContent = '输入关键词';
  }

  async function open() {
    if (!dialog) build();
    if (!dialog.open) dialog.showModal();
    dialog.classList.add('is-open');
    input.focus();
    if (!window.SiteSearchIndex) {
      status.textContent = '正在加载索引…';
      try { await loadIndex(); }
      catch (error) { status.textContent = error.message; return; }
      status.textContent = '输入关键词';
      if (input.value) render(input.value);
    }
  }

  function init() {
    const actions = document.querySelector('.topbar-actions');
    if (!actions || document.getElementById('site-search-open')) return;
    const button = document.createElement('button');
    button.id = 'site-search-open';
    button.type = 'button';
    button.className = 'icon-link site-search-open';
    button.setAttribute('aria-label', '搜索全部内容');
    button.setAttribute('data-site-ui', '');
    button.textContent = '搜索';
    button.addEventListener('click', open);
    actions.prepend(button);
    document.addEventListener('keydown', (event) => {
      const typing = event.target.closest?.('input, textarea, select, [contenteditable="true"]');
      if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing)) {
        event.preventDefault();
        open();
      }
    });
  }

  return { init, open };
})();
