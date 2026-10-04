/* Translate site-owned UI only; Markdown, paper taxonomy and user messages stay original. */
window.SiteI18n = (() => {
  const key = 'assassinlike.language';
  const phrases = {
    '博客': 'Blog', '学习': 'Learning', '论文树': 'Paper Tree', '开源项目': 'Open Source', '其它': 'Other',
    '各年年终总结': 'Annual Reviews', '只看子集：各年年终总结': 'Subset: Annual reviews only',
    '在观察自身行为和自我思考后得到的结论。': 'Reflections on my experiences, actions, and thinking.',
    '各年年终总结': 'Annual Reviews', '文章与笔记': 'Articles and notes',
    '学习过程中的专题整理。': 'Topic notes from my learning journey.',
    'invisible——学习的收益是隐性的、甚至有时没有收益': 'invisible — the benefits of learning are often unseen, and sometimes absent.',
    'permanence——留下永恒的事物': 'permanence — creating things that last.',
    '工程、工具和实践记录。': 'Notes on engineering, tools, and hands-on work.',
    '在观察自身行为和自我思考后得到的结论。': 'Reflections on my actions and thoughts.',
    '基础知识': 'Foundations', '智能体安全': 'Agent Safety', '多智能体与模型架构': 'Multi-agent Systems & Model Architectures',
    '技术文档': 'Technical Notes', '兴趣项目与实践': 'Personal Projects & Experiments', '技术随记': 'Quick Notes',
    '补齐基础概念，建立知识之间的联系。': 'Revisiting fundamentals and connecting ideas.',
    '围绕智能体与安全评测的专题整理。': 'Notes on agents and safety evaluation.',
    '从多智能体协作到 MoE 的阅读与思考。': 'Reading and reflections on agent collaboration and MoE.',
    '相对标准、偏工程和工具链的问题记录。': 'Engineering and tooling notes.',
    '更偏个人兴趣、游戏和非学术场景的技术实践。': 'Experiments with games, personal interests, and practical tools.',
    '浏览主题与状态': 'Browse topics and status', '主题': 'Topics', '全部主题': 'All topics',
    '内容状态': 'Status', '全部': 'All', '可阅读': 'Ready to read', '待补充': 'In progress',
    '篇可阅读': 'ready to read', '个开源项目': 'open-source projects', '项目介绍与使用文档': 'Project overviews and documentation',
    '搜索文章': 'Search articles', '搜索项目': 'Search projects', '搜索开源项目项目': 'Search open-source projects',
    '标题或正文关键词': 'Search titles or text', '项目名称或 README 关键词': 'Search projects or README text',
    '排序': 'Sort by', '文章排序': 'Sort articles', '项目排序': 'Sort projects',
    '默认顺序': 'Default order', '标题 A–Z': 'Title A–Z', '篇幅较短优先': 'Shortest first',
    '全部文章': 'All articles', '全部项目': 'All projects', '重置浏览': 'Reset filters',
    '文章主题': 'Article topics', '文章列表': 'Article list', '项目列表': 'Project list',
    '文章分页': 'Article pages', '项目分页': 'Project pages', '上一页': 'Previous', '下一页': 'Next',
    '阅读全文': 'Read article', '阅读 README': 'Read README', '预览暂不可用': 'Preview unavailable',
    '正文正在整理中。': 'This article is still being prepared.', '打开文章查看内容。': 'Open the article to read more.',
    '正在整理文章列表…': 'Loading the collection…', '文章暂时无法加载': 'Unable to load this article.',
    '暂时无法加载预览，可打开文章重试。': 'Preview unavailable. Open the article to try again.',
    '没有找到匹配的文章。试试其他关键词，或清除筛选。': 'No matching articles. Try another search or reset the filters.',
    '没有找到匹配的项目。试试其他关键词，或清除筛选。': 'No matching projects. Try another search or reset the filters.',
    '这个板块还没有文章。': 'No articles in this collection yet.', '这个板块还没有项目。': 'No projects in this collection yet.',
    '文章目录': 'On this page', '继续阅读': 'Keep reading', '上一篇': 'Previous article', '下一篇': 'Next article',
    '上一个项目': 'Previous project', '下一个项目': 'Next project', 'GitHub 仓库 ↗': 'GitHub repository ↗',
    '正在加载项目介绍…': 'Loading project documentation…', '未找到这个项目。': 'Project not found.',
    '暂时无法加载项目介绍，请稍后重试。': 'Unable to load project documentation. Please try again later.',
    '暂时无法加载这篇文档，请稍后重试。': 'Unable to load this document. Please try again later.',
    '论文目录暂时无法加载。': 'Unable to load the paper catalog.', '讲解暂时无法加载，请稍后重试。': 'Unable to load the notes. Please try again later.',
    '有讲解': 'With notes', '仅收录': 'Cataloged', '暂无论文': 'No papers yet', '全部论文': 'All papers',
    '正在展开论文树…': 'Loading the paper tree…', '展开主题，沿着分支阅读': 'Explore topics and follow the branches',
    '沿分类找到问题，从概述读到细节。': 'Explore by topic, from summaries to detailed notes.',
    '论文分类': 'Paper topics', '在当前分类搜索': 'Search this topic', '搜索论文': 'Search papers',
    '论文名、主题或概述中的词语': 'Title, topic, or summary keywords', '只看有讲解': 'Only papers with notes',
    '论文讲解': 'Paper notes', '阅读概述': 'Read summary', '阅读讲解': 'Read notes', '查看条目': 'View entry',
    '没有匹配的论文，试试其他词语或分类。': 'No matching papers. Try another keyword or topic.',
    '← 返回列表': '← Back to list', '讲解深度': 'Note detail', '概述': 'Summary', '详细讲解': 'Detailed notes',
    'arXiv 原论文 ↗': 'Original paper on arXiv ↗', '暂无已确认的 arXiv 链接': 'No confirmed arXiv link yet',
    '这篇尚未单独整理概述，以下为完整讲解。': 'No separate summary yet. The full notes are shown below.',
    '正在加载讲解…': 'Loading notes…', '已收录原论文，尚未添加讲解。': 'This paper is cataloged; notes have not been added yet.',
    '历史浏览': 'History', '历史浏览 ↗': 'History ↗', '每天刷新的候选记录': 'Daily passage archive',
    '每天随机刷新一段文字': 'A random passage every day', '无法加载历史记录。': 'Unable to load the archive.',
    '一个对这段文字的“诗意”的量化指标': 'A numerical estimate of how poetic this passage is',
    '自我介绍': 'About me', '知乎': 'Zhihu', '小红书': 'Xiaohongshu', '友站列表': 'Friends',
    '匿名留言': 'Guestbook', '刷新': 'Refresh', '留言': 'Message', '发送': 'Send',
    '可以匿名留言；登录后会使用第三方账号身份，也可以选择匿名显示。': 'Leave a message anonymously, or sign in with your account. You can still choose to hide your name.',
    '无需登录即可留言；取消“公开展示”后，仅站主可见。': 'No sign-in required. Uncheck “Make public” to send a message only the site owner can read.',
    '写点什么。Ctrl + Enter 发送。': 'Write something. Ctrl + Enter to send.',
    '匿名显示': 'Hide my name', '公开展示': 'Make public', '公开留言': 'Public messages',
    '非公开留言不会显示在这里。': 'Private messages are not shown here.', '匿名模式': 'Anonymous mode',
    '远程留言服务未配置，登录暂不可用。': 'The message service is not configured. Sign-in is unavailable.',
    '正在读取登录状态': 'Checking sign-in status', '匿名留言不受影响。': 'You can still leave an anonymous message.',
    '退出登录': 'Sign out', '第三方登录': 'Sign in', '登录后用平台身份留言；也可以继续匿名发送。': 'Sign in to post with your account, or continue anonymously.',
    'GitHub 登录': 'Sign in with GitHub', 'Google 登录': 'Sign in with Google', '留言不能为空。': 'Please enter a message.',
    '正在发送…': 'Sending…', '已发送并公开显示。': 'Sent and published.', '已发送，只会由站点主人查看。': 'Sent. Only the site owner can read it.',
    '留言服务暂时不可用。': 'The message service is currently unavailable.', '正在加载公开留言…': 'Loading public messages…',
    '还没有公开留言。': 'No public messages yet.', '匿名访客': 'Anonymous visitor', '已登录访客': 'Signed-in visitor',
    '秘密空间': 'Private Space', '输入密码进入秘密空间': 'Enter the password to open Private Space',
    '密码只在当前浏览器内用于解开房间密钥。远程空间只保存加密后的消息正文。': 'The password unlocks the room key in this browser only. Only encrypted messages are stored remotely.',
    '密码': 'Password', '请输入密码': 'Enter password', '进入': 'Enter',
    '仅支持两个身份：assassinlike 与 vitality x。锁定或刷新页面后需要重新输入密码。': 'Available to assassinlike and vitality x. Enter the password again after locking or refreshing the page.',
    '密码不正确，或当前浏览器不支持 Web Crypto。': 'Incorrect password, or Web Crypto is unavailable in this browser.',
    '远程已配置': 'Remote storage configured', '当前为本地模式': 'Local mode', '本地模式': 'Local mode',
    '当前身份：': 'Signed in as:', '。 消息会先在本机加密，再写入远程空间。': '. Messages are encrypted locally before being stored remotely.',
    '同步': 'Sync', '历史': 'History', '锁定': 'Lock', '关闭历史': 'Close history', '消息区': 'Messages',
    'Ctrl + Enter 发送': 'Ctrl + Enter to send', '编辑消息': 'Write a message', '在这里输入内容，确认后发送。': 'Write your message here, then send it.',
    '消息正文不会以明文写入远程或本地缓存。': 'Messages are never stored as plain text remotely or in the local cache.',
    '历史信息': 'Message history', '按时间倒序浏览已解密记录': 'Decrypted messages, newest first',
    '正在加密发送…': 'Encrypting and sending…', '远程写入失败，已保存在本地加密缓存': 'Remote save failed. Saved in the encrypted local cache.',
    '当前未配置远程后端，仍在使用本地加密缓存': 'No remote backend configured. Using the encrypted local cache.',
    '正在同步远程消息…': 'Syncing messages…', '远程同步失败，已回退到本地加密缓存': 'Remote sync failed. Using the encrypted local cache.',
    '还没有可解密的消息。先写第一条。': 'No readable messages yet. Write the first one.',
    '没有可解密的历史记录。': 'No readable message history.', '远程待同步': 'Waiting to sync',
  };
  // These are website UI surfaces, not arbitrary Chinese text in the document.
  const surfaces = '[data-site-ui], [data-language-label-zh], .topbar, .category-nav, .category-intro, .home-category-heading, .profile-social-links, .home-intro, .refresh-panel, .friend-sites-head, .guestbook, #secret-app, .history-summary, .library-facets, .library-toolbar, .library-overview, .library-group-description, .library-entry-meta, .library-entry-actions, .library-pagination, .library-empty, .library-reader-head, .article-return, .document-outline, .paper-preview-intro, .paper-explorer-head, .paper-taxonomy, .paper-leaf small, .paper-filters, .paper-results-meta, .paper-status, .paper-read-link, .paper-reader-actions, .paper-back, .paper-empty, .loading-state, .error-state';
  const content = '.language-copy, #language-toggle, #daily-quote, .history-quote, #viewer-title, .library-reader-head h1, .library-reader-content, .library-excerpt:not([data-site-ui]), .library-entry h2, .document-outline nav, .paper-reader-body, .paper-reader-title, .paper-excerpt, .paper-folder:not(.paper-all), .paper-branch summary > span, .paper-leaf > span, .doc-card-body, .project-readme-body, .guestbook-item, .secret-message, .secret-history-item, textarea, pre, code, mjx-container, script, style';
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();
  const navigationStates = new WeakMap();
  let language = 'zh';
  let initialized = false;
  let titleRecord;

  function translate(value) {
    const normalized = value.trim().replace(/\s+/g, ' ');
    let result = phrases[normalized];
    if (!result && normalized.endsWith(' ↗') && phrases[normalized.slice(0, -2)]) result = phrases[normalized.slice(0, -2)] + ' ↗';
    if (!result) {
      const patterns = [
        [/^(\d+) 个主题$/, (_, n) => `${n} ${n === '1' ? 'topic' : 'topics'}`],
        [/^(\d+) 篇待补充$/, (_, n) => `${n} in progress`],
        [/^约 (\d+) 分钟(阅读)?$/, (_, n) => `${n} min read`],
        [/^(\d+) (篇文章|个项目)(?: · 显示 (\d+)–(\d+))?$/, (_, n, unit, first, last) => `${n} ${unit === '篇文章' ? 'article' : 'project'}${n === '1' ? '' : 's'}${first ? ` · Showing ${first}–${last}` : ''}`],
        [/^第 (\d+) 页$/, (_, n) => `Page ${n}`],
        [/^← 返回(.+)列表$/, (_, name) => `← Back to ${phrases[name] || name}`],
        [/^搜索(博客|学习|其它|各年年终总结|开源项目)(文章|项目)?$/, (_, name) => `Search ${phrases[name]}`],
        [/^(\d+) 篇论文 · (\d+) 份讲解$/, (_, n, notes) => `${n} papers · ${notes} with notes`],
        [/^(.+) · (\d+) 篇$/, (_, folder, n) => `${folder === '全部论文' ? 'All papers' : folder} · ${n} papers`],
        [/^已加载 (\d+) 条公开留言。$/, (_, n) => `Loaded ${n} public messages.`],
        [/^(.+) 已登录$/, (_, provider) => `Signed in with ${provider}`],
        [/^(发送失败：|加载失败：|无法加载公开留言：)(.*)$/, (_, prefix, detail) => `${{ '发送失败：': 'Send failed: ', '加载失败：': 'Load failed: ', '无法加载公开留言：': 'Unable to load public messages: ' }[prefix]}${phrases[detail] || detail}`],
        [/^远程同步完成 · (\d+) 条$/, (_, n) => `Sync complete · ${n} messages`],
        [/^远程(读取|写入)失败 (.*)$/, (_, action, detail) => `Remote ${action === '读取' ? 'read' : 'write'} failed ${detail}`],
        [/^· 兼容显示 (\d+) 条旧版明文记录$/, (_, n) => `· Showing ${n} legacy plain-text records`],
        [/^· 已忽略 (\d+) 条无法解密记录$/, (_, n) => `· Skipped ${n} unreadable records`],
      ];
      for (const [pattern, replacement] of patterns) {
        if (pattern.test(normalized)) { result = normalized.replace(pattern, replacement); break; }
      }
    }
    return result ? value.replace(value.trim(), result) : value;
  }

  function updateText(node) {
    const current = node.nodeValue;
    const previous = originalText.get(node);
    const source = previous && current === previous.rendered ? previous.source : current;
    const rendered = language === 'en' ? translate(source) : source;
    originalText.set(node, { source, rendered });
    if (rendered !== current) node.nodeValue = rendered;
  }

  function visit(node) {
    if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('data-site-content')) return;
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.parentElement?.closest(surfaces)) updateText(node);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.matches(surfaces) || node.closest(surfaces)) {
      const records = originalAttributes.get(node) || {};
      for (const name of ['placeholder', 'aria-label', 'title', 'data-tooltip']) {
        if (!node.hasAttribute(name)) continue;
        const current = node.getAttribute(name);
        const old = records[name];
        const source = old && old.rendered === current ? old.source : current;
        const rendered = language === 'en' ? translate(source) : source;
        records[name] = { source, rendered };
        if (current !== rendered) node.setAttribute(name, rendered);
      }
      originalAttributes.set(node, records);
    }
    if (node.matches(content)) {
      // The reader's own footer/status is UI embedded beside the original content.
      node.querySelectorAll('[data-site-ui], .loading-state, .error-state, .paper-empty').forEach(visit);
      return;
    }
    if (node.hasAttribute('data-language-label-zh')) {
      const value = node.getAttribute(`data-language-label-${language}`);
      if (value !== null && node.textContent !== value) node.textContent = value;
      return;
    }
    Array.from(node.childNodes).forEach(visit);
  }

  function updateTitle() {
    if (document.documentElement.dataset.page === 'viewer') return;
    const current = document.title;
    const source = titleRecord && titleRecord.rendered === current ? titleRecord.source : current;
    const rendered = language === 'en' ? source.split(' | ').map(translate).join(' | ') : source;
    titleRecord = { source, rendered };
    if (current !== rendered) document.title = rendered;
  }

  function revealActiveNavigation() {
    document.querySelectorAll('.category-nav-inline').forEach(nav => {
      const active = nav.querySelector('.is-active');
      if (!active) return;
      const state = `${language}:${active.href}:${nav.clientWidth}`;
      if (navigationStates.get(nav) === state) return;
      navigationStates.set(nav, state);
      if (nav.scrollWidth > nav.clientWidth) {
        const relativeRight = active.getBoundingClientRect().right - nav.getBoundingClientRect().left + nav.scrollLeft;
        nav.scrollLeft = Math.max(0, relativeRight - nav.clientWidth + 4);
      }
    });
  }

  function apply(next) {
    language = next === 'en' ? 'en' : 'zh';
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    const button = document.getElementById('language-toggle');
    button.textContent = language === 'en' ? '中文' : 'English';
    button.setAttribute('aria-label', language === 'en' ? 'Switch to Chinese' : 'Switch to English');
    button.setAttribute('aria-pressed', String(language === 'en'));
    document.querySelectorAll('.language-copy').forEach(copy => { copy.hidden = copy.dataset.language !== language; });
    visit(document.body);
    updateTitle();
    revealActiveNavigation();
  }

  function init() {
    if (initialized) return;
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    initialized = true;
    let button = document.getElementById('language-toggle');
    if (!button) {
      const actions = document.createElement('div');
      actions.className = 'topbar-actions';
      button = document.createElement('button');
      button.id = 'language-toggle';
      button.className = 'icon-link language-toggle';
      button.type = 'button';
      actions.append(button);
      topbar.append(actions);
    }
    try { language = localStorage.getItem(key) === 'en' ? 'en' : 'zh'; } catch { /* Private browsing can disable storage. */ }
    button.addEventListener('click', () => {
      apply(language === 'en' ? 'zh' : 'en');
      try { localStorage.setItem(key, language); } catch { /* Keep the current page usable. */ }
    });
    apply(language);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        // Never enter content through an asynchronous text/child mutation.
        const element = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
        if (element?.closest('[data-site-content]')) continue;
        const boundary = element?.closest(content);
        const ui = element?.closest('[data-site-ui], .loading-state, .error-state, .paper-empty');
        if (boundary && (!ui || !boundary.contains(ui))) continue;
        if (record.type === 'childList') record.addedNodes.forEach(visit);
        else visit(record.target);
      }
      updateTitle();
      revealActiveNavigation();
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title', 'data-tooltip'] });
    window.addEventListener('storage', event => { if (event.key === key) apply(event.newValue); });
    window.addEventListener('resize', revealActiveNavigation);
  }
  document.addEventListener('DOMContentLoaded', init);
  return { init };
})();
