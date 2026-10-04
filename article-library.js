/* One browsable index for the homepage preview and each article category. */
window.ArticleLibrary = (() => {
  const cache = new Map();
  const mathPattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?<![\\$])\$(?!\$)(?:\\.|[^$\n])+?\$)/g;
  const isSimpleCollection = (category) => ['minors', 'invisible', 'tech'].includes(category.id);

  function entriesOf(category) {
    if (category.entries) return category.entries;
    const entries = category.groups?.length
      ? category.groups.flatMap((group) => group.docs.map((path) => ({ path, group })))
      : category.docs.filter((entry) => typeof entry === 'string').map((path) => ({ path }));
    return entries.filter((entry, index) => entries.findIndex((item) => item.path === entry.path) === index);
  }

  function countWords(content) {
    const copy = content.cloneNode(true);
    copy.querySelectorAll('.math-source, .math-display, mjx-container').forEach((node) => node.remove());
    const text = copy.textContent.replace(mathPattern, '').replace(/https?:\/\/\S+/g, '');
    const chinese = (text.match(/\p{Script=Han}/gu) || []).length;
    const words = (text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;
    return chinese + words;
  }

  function highlight(text, words) {
    return text.split(mathPattern).map((part, index) => index % 2
      ? `<span class="math-source">${escapeHtml(part)}</span>`
      : highlightText(part, words)).join('');
  }

  function highlightText(text, words) {
    if (!words.length) return escapeHtml(text);
    const pattern = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    return text.split(new RegExp(`(${pattern})`, 'gi')).map((part, i) => i % 2 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)).join('');
  }

  function excerptSlice(text, start, end) {
    // Keep formula delimiters and their contents together at either boundary.
    for (const match of text.matchAll(mathPattern)) {
      const right = match.index + match[0].length;
      if (match.index < start && start < right) start = match.index;
      if (match.index < end && end < right) end = right;
    }
    return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  }

  function summarize(markdown) {
    const template = document.createElement('template');
    template.innerHTML = renderMarkdown(markdown);
    const preview = template.content;
    const lead = Array.from(preview.querySelectorAll('p')).find((p) => {
      const text = p.textContent.trim();
      const label = p.children.length === 1 && p.firstElementChild.matches('strong, b') && p.firstElementChild.textContent.trim() === text;
      return text && !label && !/^https?:\/\//.test(text) && !p.classList.contains('preview-ellipsis');
    });
    let text = (lead?.textContent || preview.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length < 45 && /[:：]$/.test(text) && lead?.nextElementSibling?.matches('ul, ol')) {
      text += ' ' + Array.from(lead.nextElementSibling.children).map((item) => item.textContent.trim()).join('；');
    }
    const plain = markdown.split(mathPattern).map((part, index) => index % 2 ? part : part.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, '').replace(/[#*_`~]/g, '').replace(/\s+/g, ' ')).join('').trim();
    return { excerpt: excerptSlice(text, 0, 170), plain, wordCount: countWords(preview), searchText: markdown.toLocaleLowerCase(), empty: !markdown.trim() };
  }

  function loadEntry(path, group, category) {
    if (!cache.has(path)) {
      const doc = resolveDoc(path) || { path, title: displayNameFromPath(path) };
      cache.set(path, fetch(rootAssetPath(path), { cache: 'no-cache' }).then(async (response) => {
        if (!response.ok) throw new Error('文章暂时无法加载');
        return { ...doc, ...summarize(await response.text()) };
      }).catch(() => {
        cache.delete(path);
        return { ...doc, excerpt: '暂时无法加载预览，可打开文章重试。', searchText: '', missing: true };
      }));
    }
    return cache.get(path).then((doc) => ({ ...doc, group: group?.id || '', groupTitle: group?.title || category.title }));
  }

  async function mount(host, category, preparedDocs) {
    const projects = category.id === 'permanence';
    const simple = isSimpleCollection(category);
    const collectionFilter = category.collectionFilter;
    const noun = projects ? '项目' : '文章';
    const unit = projects ? '个项目' : '篇文章';
    const compact = host.classList.contains('home-category-viewport');
    host.classList.add('article-library');
    host.classList.toggle('library-simple', simple);
    if (!compact) host.closest('.page-shell')?.classList.add('library-page-shell');
    host.dataset.collection = category.id;
    host.innerHTML = '<div class="loading-state">正在整理文章列表…</div>';
    const unique = entriesOf(category);
    const docs = preparedDocs || await Promise.all(unique.map(({ path, group }) => loadEntry(path, group, category)));
    const params = compact ? new URLSearchParams() : new URL(window.location.href).searchParams;
    const state = {
      query: params.get('q') || '',
      collection: collectionFilter && params.get('collection') === collectionFilter.id ? collectionFilter.id : '',
      group: !simple && category.groups?.some((group) => group.id === params.get('group')) ? params.get('group') : '',
      sort: ['title', 'short'].includes(params.get('sort')) ? params.get('sort') : 'default',
      status: !simple && ['ready', 'empty'].includes(params.get('status')) ? params.get('status') : '',
      page: Math.max(1, Number.parseInt(params.get('page'), 10) || 1),
    };
    const pageSize = compact ? 3 : 6;
    host.innerHTML = `
      <header class="category-intro library-hero">
        ${compact ? '' : `<div class="library-eyebrow">${escapeHtml(category.titleEn || category.title)}</div><h1 class="category-intro-title">${escapeHtml(category.title)}</h1>`}
        <p class="category-intro-copy">${escapeHtml(category.description)}</p>
        ${simple ? '' : `<div class="library-statline"><span><strong>${docs.filter((doc) => !doc.empty && !doc.missing).length}</strong> ${projects ? '个开源项目' : '篇可阅读'}</span>${projects ? '<span>项目介绍与使用文档</span>' : `<span>${category.groups?.length || 1} 个主题</span>`}${docs.some((doc) => doc.empty) ? `<span>${docs.filter((doc) => doc.empty).length} 篇待补充</span>` : ''}</div>`}
      </header>
      <div class="library-workspace">
      ${simple ? '' : `<details class="library-facets" ${compact ? '' : 'open'}><summary>浏览主题与状态 <span aria-hidden="true">⌄</span></summary><div class="library-facet-content">
        <div class="library-facet-label">主题</div>
        <div class="library-groups" role="group" aria-label="文章主题"><button type="button" data-group="">全部主题 <span>${docs.length}</span></button>${(category.groups || []).map((group) => `<button type="button" data-group="${escapeAttr(group.id)}">${escapeHtml(group.title)} <span>${docs.filter((doc) => doc.group === group.id).length}</span></button>`).join('')}</div>
        <div class="library-facet-label">内容状态</div>
        <div class="library-statuses" role="group" aria-label="内容状态"><button type="button" data-status="">全部</button><button type="button" data-status="ready">可阅读</button><button type="button" data-status="empty">待补充</button></div>
      </div></details>`}
      <div class="library-main">
      <form class="library-toolbar" role="search" aria-label="搜索${escapeAttr(category.title)}">
        <label class="library-search"><span class="library-label">搜索${noun}</span><input type="search" value="${escapeAttr(state.query)}" placeholder="${projects ? '项目名称或 README 关键词' : '标题或正文关键词'}" aria-label="搜索${escapeAttr(category.title)}${noun}"></label>
        <label class="library-sort"><span class="library-label">排序</span><select aria-label="${noun}排序"><option value="default">默认顺序</option><option value="title">标题 A–Z</option><option value="short">篇幅较短优先</option></select></label>
      </form>
      <div class="library-overview"><div><div class="library-selection"></div><span class="library-count" role="status" aria-live="polite"></span></div><div class="library-overview-actions">
        ${collectionFilter ? `<button type="button" class="library-collection-filter" aria-pressed="false">${escapeHtml(collectionFilter.label)}</button>` : ''}
        <button class="library-reset" type="button" hidden>重置浏览</button>
      </div></div>
      <p class="library-group-description" hidden></p>
      <div class="library-results" tabindex="-1" data-site-ui aria-label="${noun}列表"></div>
      <nav class="library-pagination" aria-label="${noun}分页"></nav>
      </div></div>`;
    const facets = host.querySelector('.library-facets');
    if (facets && !compact && window.matchMedia?.('(max-width: 760px)').matches) facets.open = false;
    const search = host.querySelector('input[type="search"]');
    const sort = host.querySelector('select');
    const list = host.querySelector('.library-results');
    const pager = host.querySelector('.library-pagination');
    const reset = host.querySelector('.library-reset');
    const collectionButton = host.querySelector('.library-collection-filter');
    sort.value = state.sort;

    function updateUrl() {
      if (compact) return;
      const url = new URL(window.location.href);
      for (const [key, value] of Object.entries({ q: state.query, collection: state.collection, group: state.group, status: state.status, sort: state.sort === 'default' ? '' : state.sort, page: state.page > 1 ? String(state.page) : '' })) {
        if (value) url.searchParams.set(key, value);
        else url.searchParams.delete(key);
      }
      window.history.replaceState(null, '', url);
    }

    function render() {
      const words = state.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      let matches = docs.filter((doc) => (!state.collection || doc.collection === state.collection) && (!state.group || doc.group === state.group) && (!state.status || (state.status === 'empty' ? doc.empty : !doc.empty && !doc.missing)) && words.every((word) => `${doc.title} ${simple ? '' : doc.groupTitle} ${doc.searchText}`.toLocaleLowerCase().includes(word)));
      if (state.sort === 'title') matches.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN', { numeric: true }));
      else if (state.sort === 'short') matches.sort((a, b) => (a.empty || a.missing ? Infinity : a.wordCount) - (b.empty || b.missing ? Infinity : b.wordCount));
      else matches.sort((a, b) => Number(Boolean(a.empty || a.missing)) - Number(Boolean(b.empty || b.missing)));
      const pages = Math.max(1, Math.ceil(matches.length / pageSize));
      state.page = Math.min(state.page, pages);
      updateUrl();
      const start = (state.page - 1) * pageSize;
      const visible = matches.slice(start, start + pageSize);
      host.querySelector('.library-count').textContent = matches.length ? `${matches.length} ${unit} · 显示 ${start + 1}–${start + visible.length}` : `0 ${unit}`;
      const selectedGroup = category.groups?.find((group) => group.id === state.group);
      host.querySelector('.library-selection').textContent = state.collection ? collectionFilter.title : selectedGroup?.title || `全部${noun}`;
      const description = host.querySelector('.library-group-description');
      description.hidden = !selectedGroup?.description;
      description.textContent = selectedGroup?.description || '';
      reset.hidden = !state.query && !state.collection && !state.group && !state.status && state.sort === 'default';
      collectionButton?.setAttribute('aria-pressed', String(Boolean(state.collection)));
      host.querySelectorAll('[data-group]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.group === state.group)));
      host.querySelectorAll('[data-status]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.status === state.status)));
      const from = compact ? categoryHref(category.id) + (state.collection ? '&collection=' + encodeURIComponent(state.collection) : '') : window.location.pathname + window.location.search;
      window.MathJax?.typesetClear?.([list]);
      list.innerHTML = visible.map((doc, index) => {
        const href = `${doc.href || viewerHref(doc.path)}&from=${encodeURIComponent(from)}`;
        let excerpt = doc.empty && !simple ? '正文正在整理中。' : doc.excerpt || '打开文章查看内容。';
        if (words.length && doc.plain) {
          const position = doc.plain.toLocaleLowerCase().indexOf(words[0]);
          if (position >= 0) excerpt = excerptSlice(doc.plain, Math.max(0, position - 45), position + 140);
        }
        return `<article class="library-entry ${doc.empty && !simple ? 'is-draft' : ''}">
          <span class="library-entry-number" aria-hidden="true">${String(start + index + 1).padStart(2, '0')}</span><div class="library-entry-content">
          <div class="library-entry-meta">${collectionFilter && doc.collection === collectionFilter.id ? `<span>${escapeHtml(collectionFilter.title)}</span>` : ''}${simple ? '' : `<span>${escapeHtml(doc.groupTitle)}</span>`}${doc.empty ? (simple ? '' : '<span>待补充</span>') : doc.missing ? '<span>预览暂不可用</span>' : `<span>${doc.wordCount} 字</span>`}</div>
          <h2><a href="${escapeAttr(href)}">${highlight(doc.title, words)}</a></h2>
          <p class="library-excerpt" ${doc.empty || doc.missing || !doc.excerpt ? 'data-site-ui' : ''}>${highlight(excerpt, words)}</p>
          <div class="library-entry-actions">${doc.empty && !simple ? '' : `<a class="library-read" href="${escapeAttr(href)}">${projects ? '阅读 README' : '阅读全文'} <span aria-hidden="true">↗</span></a>`}${doc.repository ? `<a class="library-repository" href="${escapeAttr(doc.repository)}" target="_blank" rel="noopener noreferrer">GitHub ↗</a>` : ''}</div>
          </div>
        </article>`;
      }).join('') || `<div class="library-empty">${docs.length ? `没有找到匹配的${noun}。试试其他关键词，或清除筛选。` : `这个板块还没有${noun}。`}</div>`;
      typesetMath(list);
      pager.hidden = pages <= 1;
      if (pages > 1) {
        const pageNumbers = new Set([1, pages, state.page - 1, state.page, state.page + 1].filter((page) => page >= 1 && page <= pages));
        let previous = 0;
        const numbers = Array.from(pageNumbers).sort((a, b) => a - b).map((page) => {
          const gap = previous && page > previous + 1 ? '<span aria-hidden="true">…</span>' : '';
          previous = page;
          return `${gap}<button type="button" data-page="${page}" aria-label="第 ${page} 页" ${page === state.page ? 'aria-current="page"' : ''}>${page}</button>`;
        }).join('');
        pager.innerHTML = `<button type="button" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}>上一页</button>${numbers}<button type="button" data-page="${state.page + 1}" ${state.page === pages ? 'disabled' : ''}>下一页</button>`;
      } else pager.innerHTML = '';
    }

    host.querySelector('form').addEventListener('submit', (event) => event.preventDefault());
    search.addEventListener('input', () => { state.query = search.value; state.page = 1; render(); });
    sort.addEventListener('change', () => { state.sort = sort.value; state.page = 1; render(); });
    collectionButton?.addEventListener('click', () => { state.collection = state.collection ? '' : collectionFilter.id; state.page = 1; render(); });
    reset.addEventListener('click', () => { state.query = ''; state.collection = ''; state.group = ''; state.status = ''; state.sort = 'default'; state.page = 1; search.value = ''; sort.value = 'default'; render(); search.focus(); });
    host.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-group], button[data-page], button[data-status]');
      if (!button || !host.contains(button) || button.disabled) return;
      if (button.hasAttribute('data-group')) { state.group = button.dataset.group; state.page = 1; render(); }
      else if (button.hasAttribute('data-status')) { state.status = button.dataset.status; state.page = 1; render(); }
      else {
        state.page = Number(button.dataset.page);
        render();
        list.focus({ preventScroll: true });
        if (compact) host.scrollTop = 0;
        else host.querySelector('.library-toolbar').scrollIntoView({ block: 'start' });
      }
    });
    render();
  }

  function enhanceReader(host, doc, returnUrl, category) {
    if (host.querySelector('.error-state')) return;
    const simple = isSimpleCollection(category);
    host.classList.add('library-reader');
    host.closest('.page-shell')?.classList.add('library-reader-shell');
    const back = host.querySelector('.article-return');
    const outline = host.querySelector('.document-outline');
    const content = document.createElement('div');
    content.className = 'library-reader-content';
    Array.from(host.childNodes).filter((node) => node !== back && node !== outline).forEach((node) => content.append(node));
    const wordCount = countWords(content);
    const empty = Boolean(content.querySelector('.loading-state'));
    if (empty) content.querySelector('.loading-state').textContent = simple ? 'No content found.' : '正文正在整理中。';
    const entries = entriesOf(category);
    const group = entries.find((entry) => entry.path === doc.path)?.group;
    const header = document.createElement('header');
    header.className = 'library-reader-head';
    header.innerHTML = `<div class="library-eyebrow">${escapeHtml(simple ? category.title : group?.title || category.title)}</div><h1>${escapeHtml(doc.title)}</h1>${empty && simple ? '' : `<p>${empty ? '待补充' : `${wordCount} 字`}</p>`}`;
    const sourceTitle = content.firstElementChild;
    if (sourceTitle?.matches('h1') && sourceTitle.textContent.trim() === doc.title.trim()) {
      // Preserve README / article title anchors while showing the title only once.
      header.querySelector('h1').id = sourceTitle.id;
      sourceTitle.remove();
    }
    if (back) header.prepend(back);
    host.append(header);
    const workspace = document.createElement('div');
    workspace.className = 'library-reader-workspace';
    if (outline) {
      const aside = document.createElement('aside');
      aside.className = 'library-reader-aside';
      aside.append(outline);
      workspace.append(aside);
      if (window.matchMedia?.('(max-width: 760px)').matches) outline.open = false;
    } else workspace.classList.add('without-outline');
    workspace.append(content);
    host.append(workspace);
    const position = entries.findIndex((entry) => entry.path === doc.path);
    const siblings = [[entries[position - 1], '上一篇'], [entries[position + 1], '下一篇']].filter(([entry]) => entry);
    if (siblings.length) {
      const nav = document.createElement('nav');
      nav.className = 'library-adjacent';
      nav.setAttribute('data-site-ui', '');
      nav.setAttribute('aria-label', '继续阅读');
      nav.innerHTML = siblings.map(([entry, label]) => `<a href="${escapeAttr((entry.href || viewerHref(entry.path)) + '&from=' + encodeURIComponent(returnUrl))}"><small data-site-ui>${category.id === 'permanence' ? label.replace('篇', '个项目') : label}</small><span data-site-content>${escapeHtml(entry.title || resolveDoc(entry.path)?.title || displayNameFromPath(entry.path))} ↗</span></a>`).join('');
      content.append(nav);
    }
    if (outline && window.IntersectionObserver) {
      const links = Array.from(outline.querySelectorAll('a'));
      const headings = Array.from(host.querySelectorAll('.library-reader-head h1[id], .library-reader-content :is(h1[id], h2[id], h3[id], h4[id], h5[id], h6[id])'));
      const observer = new IntersectionObserver((changes) => {
        const visible = changes.filter((change) => change.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        links.forEach((link) => {
          if (decodeURIComponent(link.hash.slice(1)) === visible.target.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }, { rootMargin: '-5% 0px -65% 0px', threshold: 0 });
      headings.forEach((heading) => observer.observe(heading));
    }
  }

  return { mount, enhanceReader, summarize };
})();
