/* Local exports supply the taxonomy; both the homepage and reader use it. */
window.PaperTree = (() => {
  let catalogPromise;
  const notes = new Map();

  function catalog() {
    if (!catalogPromise) {
      catalogPromise = fetch('/assets/papers/index.json', { cache: 'no-cache' })
        .then((response) => {
          if (!response.ok) throw new Error('论文目录暂时无法加载。');
          return response.json();
        }).catch((error) => { catalogPromise = null; throw error; });
    }
    return catalogPromise;
  }

  function paperHref(id) {
    return `/category.html?cat=papers&paper=${encodeURIComponent(id)}`;
  }

  function note(id) {
    if (!notes.has(id)) {
      notes.set(id, fetch(`/assets/papers/notes/${encodeURIComponent(id)}.json`)
        .then((response) => {
          if (!response.ok) throw new Error('讲解暂时无法加载，请稍后重试。');
          return response.json();
        }).catch((error) => { notes.delete(id); throw error; }));
    }
    return notes.get(id);
  }

  function status(paper) {
    return paper.hasNote ? '有讲解' : '仅收录';
  }

  function leavesHtml(ids, byId, compact) {
    return ids.map((id) => {
      const paper = byId.get(id);
      const label = `<span class="paper-note-dot ${paper.hasNote ? 'has-note' : ''}" aria-hidden="true"></span><span>${escapeHtml(paper.title)}</span><small>${status(paper)}</small>`;
      return `<li>${compact
        ? `<a class="paper-leaf" href="${paperHref(id)}">${label}</a>`
        : `<button class="paper-leaf" type="button" data-paper="${id}">${label}</button>`}</li>`;
    }).join('');
  }

  function branchHtml(node, byId, compact) {
    return `<li><details class="paper-branch">
      <summary>${compact
        ? `<span>${escapeHtml(node.name)}</span>`
        : `<button type="button" class="paper-folder" data-folder="${escapeAttr(node.id)}">${escapeHtml(node.name)}</button>`}
        <small>${node.count}</small>
      </summary>
      <ul>${node.children.map((child) => branchHtml(child, byId, compact)).join('')}${leavesHtml(node.papers, byId, compact)}</ul>
      ${node.count ? '' : '<p class="paper-empty">暂无论文</p>'}
    </details></li>`;
  }

  function renderNote(source) {
    // Preserve fenced code while adapting both LaTeX delimiter styles.
    let fence = null;
    const markdown = source.split('\n').map((line) => {
      const match = line.trim().match(/^(`{3,}|~{3,})/);
      if (match) {
        if (!fence) fence = match[1];
        else if (match[1][0] === fence[0] && match[1].length >= fence.length) fence = null;
        return line;
      }
      return fence ? line : line.replace(/\\\[/g, () => '$$').replace(/\\\]/g, () => '$$')
        .replace(/\\\(/g, () => '$').replace(/\\\)/g, () => '$');
    }).join('\n');
    return renderMarkdown(markdown, { linkScope: 'none' });
  }

  async function mount(host, { compact = false } = {}) {
    host.innerHTML = '<p class="paper-empty">正在展开论文树…</p>';
    try {
      const data = await catalog();
      const byId = new Map(data.papers.map((paper) => [paper.id, paper]));
      const stats = `${data.tree.count} 篇论文 · ${data.tree.annotated} 份讲解`;
      host.classList.add('paper-tree-host');
      if (compact) {
        host.innerHTML = `<div class="paper-preview-intro"><span>${stats}</span><span>展开主题，沿着分支阅读</span></div>
          <ul class="paper-tree-list paper-tree-compact">${data.tree.children.map((node) => branchHtml(node, byId, true)).join('')}${leavesHtml(data.tree.papers, byId, true)}</ul>`;
        return;
      }

      host.innerHTML = `<div class="paper-explorer">
        <header class="paper-explorer-head"><div class="paper-eyebrow">READING ATLAS</div>
          <h1>论文树</h1><p>沿分类找到问题，从概述读到细节。</p><div class="paper-stats">${stats}</div>
        </header>
        <div class="paper-workspace">
          <nav class="paper-taxonomy" aria-label="论文分类">
            <button class="paper-folder paper-all" type="button" data-folder="">全部论文 <small>${data.tree.count}</small></button>
            <ul class="paper-tree-list">${data.tree.children.map((node) => branchHtml(node, byId, false)).join('')}${leavesHtml(data.tree.papers, byId, false)}</ul>
          </nav>
          <div class="paper-main">
            <form class="paper-filters" role="search">
              <label class="paper-search-label">在当前分类搜索<input type="search" placeholder="论文名、主题或概述中的词语" aria-label="搜索论文"></label>
              <label class="paper-notes-filter"><input type="checkbox"> 只看有讲解</label>
            </form>
            <div class="paper-results-meta" role="status" aria-live="polite"></div>
            <div class="paper-results"></div>
            <section class="paper-reader" aria-label="论文讲解" hidden></section>
          </div>
        </div>
      </div>`;

      const list = host.querySelector('.paper-results');
      const meta = host.querySelector('.paper-results-meta');
      const reader = host.querySelector('.paper-reader');
      const filters = host.querySelector('.paper-filters');
      const search = filters.querySelector('input[type="search"]');
      const annotated = filters.querySelector('input[type="checkbox"]');
      let folder = '';
      let current = null;
      let request = 0;

      function showList() {
        request += 1;
        current = null;
        window.MathJax?.typesetClear?.([reader]);
        reader.hidden = true;
        reader.innerHTML = '';
        list.hidden = false;
        filters.hidden = false;
        const query = search.value.trim().toLocaleLowerCase();
        const matches = data.papers.filter((paper) =>
          (!folder || paper.category === folder || paper.category.startsWith(folder + '/')) &&
          (!annotated.checked || paper.hasNote) &&
          `${paper.title} ${paper.category} ${paper.excerpt}`.toLocaleLowerCase().includes(query),
        );
        meta.textContent = `${folder ? folder.split('/').join(' / ') : '全部论文'} · ${matches.length} 篇`;
        list.innerHTML = matches.map((paper) => `<article class="paper-card">
          <div class="paper-card-top"><span>${escapeHtml(paper.category.split('/').join(' / '))}</span><span class="paper-status ${paper.hasNote ? 'has-note' : ''}">${status(paper)}</span></div>
          <h2><button type="button" data-paper="${paper.id}">${escapeHtml(paper.title)}</button></h2>
          ${paper.excerpt ? `<p class="paper-excerpt">${escapeHtml(paper.excerpt)}</p>` : ''}
          <a class="paper-read-link" href="${paperHref(paper.id)}" data-paper="${paper.id}">${paper.hasSummary ? '阅读概述' : paper.hasNote ? '阅读讲解' : '查看条目'} ↗</a>
        </article>`).join('') || '<p class="paper-empty">没有匹配的论文，试试其他词语或分类。</p>';
        host.querySelectorAll('[data-folder]').forEach((button) => {
          button.setAttribute('aria-current', String(button.dataset.folder === folder));
        });
        host.querySelectorAll('[data-paper]').forEach((button) => button.removeAttribute('aria-current'));
        const url = new URL(window.location.href);
        url.searchParams.delete('paper');
        window.history.replaceState(null, '', url);
      }

      async function showPaper(id, mode) {
        const paper = byId.get(id);
        if (!paper) return;
        current = id;
        const token = ++request;
        const selectedMode = mode || (paper.hasSummary ? 'summary' : 'detail');
        list.hidden = true;
        filters.hidden = true;
        reader.hidden = false;
        meta.textContent = paper.category.split('/').join(' / ');
        window.MathJax?.typesetClear?.([reader]);
        reader.innerHTML = `<button class="paper-back" type="button" data-back>← 返回列表</button>
          <h2 class="paper-reader-title" tabindex="-1">${escapeHtml(paper.title)}</h2>
          <div class="paper-reader-actions">
            ${paper.hasNote ? `<div class="paper-modes" role="group" aria-label="讲解深度">
              <button type="button" data-mode="summary" aria-pressed="${selectedMode === 'summary'}" ${paper.hasSummary ? '' : 'disabled'}>概述</button>
              <button type="button" data-mode="detail" aria-pressed="${selectedMode === 'detail'}">详细讲解</button>
            </div>` : ''}
            ${paper.arxivUrl ? `<a href="${escapeAttr(paper.arxivUrl)}" target="_blank" rel="noopener noreferrer">arXiv 原论文 ↗</a>` : '<span class="paper-source-unavailable">暂无已确认的 arXiv 链接</span>'}
          </div>
          ${paper.hasNote && !paper.hasSummary ? '<p class="paper-empty">这篇尚未单独整理概述，以下为完整讲解。</p>' : ''}
          <div class="paper-reader-body markdown-body">${paper.hasNote ? '<p data-site-ui>正在加载讲解…</p>' : '<p class="paper-empty">已收录原论文，尚未添加讲解。</p>'}</div>`;
        const url = new URL(window.location.href);
        url.searchParams.set('paper', id);
        window.history.replaceState(null, '', url);
        host.querySelectorAll('[data-paper]').forEach((element) => {
          element.setAttribute('aria-current', String(element.dataset.paper === id));
          if (element.dataset.paper === id) {
            let parent = element.parentElement;
            while (parent && parent !== host) {
              if (parent.tagName === 'DETAILS') parent.open = true;
              parent = parent.parentElement;
            }
          }
        });
        if (!paper.hasNote) return;
        try {
          const content = await note(id);
          if (token !== request) return;
          const body = reader.querySelector('.paper-reader-body');
          body.innerHTML = renderNote(selectedMode === 'summary' ? content.summary : content.detail);
          // Notes are Markdown, not executable content; only web links are active.
          body.querySelectorAll('a').forEach((anchor) => {
            if (!/^(https?:|mailto:|#)/i.test(anchor.getAttribute('href') || '')) anchor.removeAttribute('href');
          });
          enhanceMarkdownHost(body);
        } catch (error) {
          if (token === request) reader.querySelector('.paper-reader-body').innerHTML = `<p class="paper-empty">${escapeHtml(error.message)}</p>`;
        }
      }

      filters.addEventListener('submit', (event) => event.preventDefault());
      search.addEventListener('input', showList);
      annotated.addEventListener('change', showList);
      host.addEventListener('click', (event) => {
        const button = event.target.closest('[data-folder], [data-paper], [data-mode], [data-back]');
        if (!button || !host.contains(button)) return;
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (button.hasAttribute('data-folder')) {
          folder = button.dataset.folder;
          const branch = button.closest('details');
          if (branch) branch.open = true;
          showList();
        } else if (button.hasAttribute('data-paper')) {
          showPaper(button.dataset.paper);
          reader.querySelector('.paper-reader-title').focus({ preventScroll: true });
          reader.scrollIntoView({ block: 'start' });
        } else if (button.hasAttribute('data-back')) {
          showList();
          search.focus({ preventScroll: true });
          filters.scrollIntoView({ block: 'start' });
        } else if (current) {
          showPaper(current, button.dataset.mode);
        }
      });
      const initial = new URL(window.location.href).searchParams.get('paper');
      if (byId.has(initial)) await showPaper(initial);
      else showList();
    } catch (error) {
      host.innerHTML = `<p class="paper-empty">${escapeHtml(error.message)}</p>`;
    }
  }

  return { mount };
})();
