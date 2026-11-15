/* Experiment retrospectives: one entry per project, each with its own write-ups and repositories. */
window.Experiments = (() => {
  let indexPromise;
  const pages = new Map();

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch('/assets/experiments/index.json', { cache: 'no-cache' })
        .then((response) => (response.ok ? response.json() : { projects: [] }))
        .then((data) => data.projects || [])
        .catch(() => { indexPromise = null; return []; });
    }
    return indexPromise;
  }

  function loadPage(file) {
    if (!pages.has(file)) {
      pages.set(file, fetch('/assets/experiments/' + file, { cache: 'no-cache' })
        .then((response) => (response.ok ? response.text() : ''))
        .catch(() => ''));
    }
    return pages.get(file);
  }

  function href(id, docId) {
    return `/viewer.html?experiment=${encodeURIComponent(id)}${docId ? '&doc=' + encodeURIComponent(docId) : ''}`;
  }

  function linkTemplates(project) {
    return [
      project.github ? `<a class="library-repository more-link is-external" href="${escapeAttr(project.github)}" target="_blank" rel="noopener noreferrer">GitHub</a>` : '',
      project.huggingface ? `<a class="library-repository more-link is-external" href="${escapeAttr(project.huggingface)}" target="_blank" rel="noopener noreferrer">HuggingFace</a>` : '',
    ].join('');
  }

  function renderList(host, projects, { compact = false } = {}) {
    const visible = compact ? projects.slice(0, 3) : projects;
    const cards = visible.map((project, index) => `
      <article class="library-entry experiment-entry">
        <span class="library-entry-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
        <div class="library-entry-content">
          <div class="library-entry-meta"><span data-site-ui>${project.docs.length} 篇复盘</span>${project.huggingface ? '<span data-site-ui>含 HuggingFace 资源</span>' : ''}</div>
          <h2><a href="${escapeAttr(href(project.id))}" data-site-content>${escapeHtml(project.title)}</a></h2>
          <p class="library-excerpt" data-site-content>${escapeHtml(project.summary)}</p>
          <div class="library-entry-actions">
            ${project.docs.map((doc) => `<a class="library-read more-link" href="${escapeAttr(href(project.id, doc.id))}" data-site-content>${escapeHtml(doc.title)}</a>`).join('')}
            ${linkTemplates(project)}
          </div>
        </div>
      </article>`).join('');
    host.innerHTML = `
      <header class="category-intro library-hero">
        ${compact ? '' : '<h1 class="category-intro-title">实验记录</h1>'}
        <p class="category-intro-copy">${escapeHtml(CATEGORY_DEFINITIONS.experiments.description)}</p>
        <div class="library-statline"><span data-site-ui>${projects.length} 个实验</span><span data-site-ui>${projects.reduce((sum, project) => sum + project.docs.length, 0)} 篇复盘</span></div>
      </header>
      <div class="library-results">${cards || '<div class="library-empty">这个板块还没有实验记录。</div>'}</div>
      ${compact && projects.length > visible.length ? `<a class="more-link library-preview-more" href="${categoryHref('experiments')}">查看全部 ${projects.length} 个实验</a>` : ''}`;
    typesetMath(host);
  }

  async function mount(host, { compact = false } = {}) {
    if (!compact) host.closest('.page-shell')?.classList.add('library-page-shell');
    host.classList.add('article-library');
    host.innerHTML = '<div class="loading-state">正在加载实验记录…</div>';
    renderList(host, await loadIndex(), { compact });
  }

  async function mountViewer(host, projectId, docId) {
    const projects = await loadIndex();
    const project = projects.find((item) => item.id === projectId);
    if (!project) {
      host.innerHTML = '<div class="error-state">未找到这个实验。</div>';
      return;
    }
    const chosen = project.docs.find((doc) => doc.id === docId) || project.docs[0];
    const titleHost = document.getElementById('viewer-title');
    const subtitleHost = document.getElementById('viewer-subtitle');
    document.title = `${project.title} | assassinlike`;
    if (titleHost) titleHost.textContent = project.title;
    if (subtitleHost) subtitleHost.textContent = '实验记录';
    host.classList.add('library-reader');
    host.closest('.page-shell')?.classList.add('library-reader-shell');
    host.innerHTML = '<div class="loading-state">正在加载复盘…</div>';

    const text = await loadPage(chosen.file);
    const body = document.createElement('div');
    body.innerHTML = renderMarkdown(text, { basePath: '/assets/experiments/' + chosen.file });
    // The page header already shows the title, so drop the document's own H1.
    if (body.firstElementChild?.matches('h1')) body.firstElementChild.remove();
    host.innerHTML = `
      <div class="article-return"><a href="${categoryHref('experiments')}">← 返回实验记录列表</a></div>
      <header class="library-reader-head">
        <div class="library-eyebrow" data-site-content>${escapeHtml(project.title)}</div>
        <h1 data-site-content>${escapeHtml(chosen.title)}</h1>
        <nav class="experiment-docs" aria-label="实验文档">${project.docs.map((doc) => `<a href="${escapeAttr(href(project.id, doc.id))}" data-site-content${doc.id === chosen.id ? ' aria-current="page"' : ''}>${escapeHtml(doc.title)}</a>`).join('')}</nav>
        <div class="experiment-links">${linkTemplates(project)}</div>
      </header>
      <div class="library-reader-workspace without-outline"><div class="library-reader-content">${body.innerHTML}</div></div>`;
    enhanceMarkdownHost(host);
    window.scrollTo(0, 0);
  }

  return { mount, mountViewer };
})();
