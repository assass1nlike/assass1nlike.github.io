const SITE_TIME_ZONE = 'Asia/Shanghai';
const QUOTE_START_DATE_KEY = '2026-05-11';
const DEFAULT_DOCUMENT_PATH = 'everlasting/invisible/preliminaries.md';
const QUOTE_CSV_PATH = '/everlasting/invisible/tech/na/osu-get-poetry-difficulties/poetic_diffs.csv';
const GUESTBOOK_CACHE_KEY = 'assassinlike.guestbook.profile.v1';
const GUESTBOOK_REMOTE_POLL_MS = 15000;

const FRIEND_SITES = [
  {
    name: "Axi's Blog",
    description: '一直可爱小猫',
    href: 'https://axi404.top',
    avatar: '/figs/friends/axi404.png',
  },
  {
    name: '拜泪X`Blog',
    description: '博客,但是试作品',
    href: 'https://critel.github.io/',
    avatar: '/figs/friends/critel.jpg',
  },
  { name: '森森的博客', description: '', href: 'https://msensen.top/', avatar: '/figs/friends/msensen.jpg' },
  { name: "master's blog", description: 'Notes on artificial intelligence, brain-computer interfaces, and life.', href: 'https://brianwang2007.com/', avatar: '/figs/friends/brianwang2007.jpeg' },
  { name: '時雨のBlog', description: 'A CS-AI Sophomore | XJTU', href: 'https://www.shiiyu.xyz/', avatar: '/figs/friends/shiiyu.png' },
  { name: '愿你我,写下新的结局...', description: 'Together,for end we like...', href: 'https://shadowalone.me.cyrene.xin/', avatar: '/figs/friends/shadowalone.png' },
  { name: "Feli77's Blog", description: 'A campsite to share knowledge and thoughts.', href: 'https://feli77.com/', avatar: '' },
  { name: 'Ajisai', description: '喜欢拍拍照', href: 'https://ajisai.vip/', avatar: '/figs/friends/ajisai.jpg' },
  { name: '新世纪传说的个人博客', description: '', href: 'https://faroars.com/', avatar: '/figs/friends/faroars.jpg' },
];

const CATEGORY_DEFINITIONS = {
  permanence: {
    id: 'permanence',
    title: '开源项目',
    titleEn: 'Open Source',
    heading: '开源项目',
    description: '各种实用或有趣的项目',
    docs: [],
  },
  invisible: {
    id: 'invisible',
    title: '学习',
    titleEn: 'Learning',
    heading: '学习',
    description: '为科研进行的学习，涉及大量数学推导。大多为手搓，以及经过多轮 review 与迭代的 AI 总结',
    docs: [],
  },
  minors: {
    id: 'minors',
    title: '博客',
    titleEn: 'Blog',
    heading: '博客',
    collectionFilter: { id: 'annual', title: '各年年终总结', label: '只看子集：各年年终总结' },
    description: '笔下的文字，有关技术或思考',
    docs: [],
  },
  papers: {
    id: 'papers',
    title: '论文树',
    titleEn: 'Paper Tree',
    heading: '论文树',
    description: '读过的所有论文。部分配有AI给出的讲解',
    docs: [],
  },
  tech: {
    id: 'tech',
    title: '其它',
    titleEn: 'Other',
    heading: '其它',
    description: '一些经过试错，值得总结的工具使用和问题研究等。不具有创新性，且大多为纯 AI 总结',
    docs: [],
  },
};

const DOC_DEFINITIONS = [
  ...(window.ArticleCatalog || []),
  {
    path: 'everlasting/invisible/minors/cybergym/determined.md',
    title: 'cybergym',
    aliases: ['cybergym', 'cybergym/determined.md'],
    category: 'minors',
  },
  {
    path: 'everlasting/invisible/minors/recurrent_MoE/determined.md',
    title: 'recurrent MoE',
    aliases: ['recurrent moe', 'recurrent_MoE', 'recurrent MoE'],
    category: 'minors',
  },
  {
    path: 'everlasting/invisible/desire.md',
    title: 'desire',
    aliases: ['desire', 'desire.md'],
    category: null,
  },
  {
    path: 'everlasting/invisible/limitless.md',
    title: 'limitless',
    aliases: ['limitless', 'limitless.md'],
    category: 'invisible',
  },
  {
    path: 'everlasting/invisible/ailife.md',
    title: 'ailife',
    aliases: ['ailife', 'ailife.md'],
    category: 'invisible',
  },
  {
    path: 'everlasting/invisible/order.md',
    title: 'order',
    aliases: ['order', 'order.md', '逻辑序整理'],
    category: 'invisible',
  },
  {
    path: 'everlasting/invisible/assassin_experiment/failAEoverview.md',
    title: '刺客实验',
    aliases: ['刺客实验', 'assassin_experiment', 'assassin_experiment.md', 'failAEoverview.md'],
    category: null,
  },
];

// Rebuild the shared publication list with: python scripts/export-articles.py
for (const id of ['invisible', 'minors', 'tech']) {
  CATEGORY_DEFINITIONS[id].docs = (window.ArticleCatalog || [])
    .filter((doc) => doc.category === id).map((doc) => doc.path);
}

const CATEGORY_LINK_PATTERNS = [
  { pattern: '开源项目', href: categoryHref('permanence') },
  { pattern: '博客', href: categoryHref('minors') },
  { pattern: 'tech总览', href: categoryHref('tech') },
  { pattern: '各年年终总结', href: categoryHref('annual') },
];

const DOC_LINK_PATTERNS = buildDocLinkPatterns();
const HOME_TEXT_PATTERNS = [...CATEGORY_LINK_PATTERNS, ...DOC_LINK_PATTERNS];

const DOC_INDEX = new Map(DOC_DEFINITIONS.flatMap((doc) =>
  [doc.path, doc.publicId].filter(Boolean).map((key) => [normalizeKey(key), doc])));
const DOC_ALIAS_INDEX = new Map();
for (const doc of DOC_DEFINITIONS) {
  for (const alias of [doc.title, ...doc.aliases, basename(doc.path), basename(doc.path).replace(/\.md$/i, '')]) {
    DOC_ALIAS_INDEX.set(normalizeKey(alias), doc);
  }
}

const CATEGORY_ORDER = ['invisible', 'papers', 'minors', 'permanence', 'tech'];

let quoteCandidatesPromise = null;
let quotePoolPromise = null;
const pendingMathHosts = new Set();
const guestbookState = {
  config: normalizeGuestbookConfig(window.GUESTBOOK_CONFIG),
  profile: readGuestbookProfile(),
  host: null,
  authClient: null,
  session: null,
  user: null,
  authReady: false,
  authError: '',
  emailLogin: { email: '', sent: false, busy: false, notice: '', expanded: false },
  pollTimer: null,
};

document.addEventListener('DOMContentLoaded', () => {
  initLanguageToggle();
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
  if (page === 'friends') {
    document.getElementById('friends-directory').innerHTML = renderFriendDirectory(shuffledFriendSites());
    return;
  }
  initHomePage();
});

function initLanguageToggle() {
  window.SiteI18n?.init();
}

window.addEventListener('mathjax-loaded', () => {
  flushPendingMathTypesetting();
});

async function initHomePage() {
  const quoteHost = document.getElementById('daily-quote');
  const quoteMeta = document.getElementById('daily-quote-meta');
  const quoteScoreHelp = document.getElementById('quote-score-help');
  const previewsHost = document.getElementById('home-category-previews');
  const categoryNav = document.getElementById('category-nav');
  const friendSitesHost = document.getElementById('friend-sites');
  const guestbookHost = document.getElementById('guestbook');

  if (categoryNav) {
    categoryNav.innerHTML = CATEGORY_ORDER.map((id) => {
      const category = CATEGORY_DEFINITIONS[id];
      return `<a class="pill-link" href="${categoryHref(id)}" data-language-label-zh="${escapeAttr(category.title)}" data-language-label-en="${escapeAttr(category.titleEn || category.title)}">${escapeHtml(category.title)}</a>`;
    }).join('');
  }

  const previewsReady = previewsHost ? loadHomeCategoryPreviews(previewsHost) : Promise.resolve();

  if (quoteHost) {
    try {
      const quote = await getDailyQuote();
      quoteHost.textContent = quote.text;
      if (quoteMeta) {
        quoteMeta.textContent = `${quote.dateKey} · score ${quote.score.toFixed(2)}`;
      }
      if (quoteScoreHelp) {
        quoteScoreHelp.hidden = false;
      }
    } catch (_error) {
      quoteHost.textContent = 'The quote source is temporarily unavailable.';
      if (quoteMeta) {
        quoteMeta.textContent = '';
      }
      if (quoteScoreHelp) {
        quoteScoreHelp.hidden = true;
      }
    }
  }

  await previewsReady;

  if (friendSitesHost) {
    friendSitesHost.innerHTML = renderFriendSites(shuffledFriendSites());
  }

  if (guestbookHost) {
    initGuestbook(guestbookHost);
  }
}

async function loadHomeCategoryPreviews(host) {
  const categories = CATEGORY_ORDER.filter((id) => id !== 'tech').map((id) => CATEGORY_DEFINITIONS[id]);
  const english = document.documentElement.lang === 'en';
  host.innerHTML = categories.map((category) => `
    <section class="home-category-preview" aria-labelledby="home-category-${category.id}">
      <h2 class="home-category-heading" id="home-category-${category.id}">
        <a href="${categoryHref(category.id)}">
          <span data-language-label-zh="${escapeAttr(category.title)}" data-language-label-en="${escapeAttr(category.titleEn)}">${escapeHtml(english ? category.titleEn : category.title)}</span>
          <span aria-hidden="true">↗</span>
        </a>
      </h2>
      <div class="home-category-viewport markdown-body" data-category="${category.id}" tabindex="0" role="region" aria-labelledby="home-category-${category.id}"></div>
    </section>
  `).join('');

  await Promise.all(Array.from(host.querySelectorAll('[data-category]'), (viewport) =>
    loadCategoryInto(viewport, CATEGORY_DEFINITIONS[viewport.dataset.category]),
  ));
}

function shuffledFriendSites() {
  const sites = [...FRIEND_SITES];
  for (let i = sites.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [sites[i], sites[j]] = [sites[j], sites[i]];
  }
  return sites;
}

function friendAvatar(site) {
  return site.avatar
    ? `<img class="friend-avatar" src="${escapeAttr(site.avatar)}" alt="" loading="lazy" decoding="async">`
    : '<span class="friend-avatar is-empty" aria-hidden="true"></span>';
}

function renderFriendSites(sites) {
  return `
    <section class="friend-sites-panel" aria-labelledby="friend-sites-title">
      <div class="friend-sites-head">
        <h2 id="friend-sites-title" class="friend-sites-title">友站列表</h2>
        <a class="friend-directory-link" href="/friends.html">查看全部友站 ↗</a>
      </div>
      <div class="friend-avatar-list">${sites.map((site) => `<a class="friend-avatar-link" href="${escapeAttr(site.href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttr(site.name)}" title="${escapeAttr(site.name)}">${friendAvatar(site)}</a>`).join('')}</div>
    </section>
  `;
}

function renderFriendDirectory(sites) {
  return sites.map((site) => `<a class="friend-card" href="${escapeAttr(site.href)}" target="_blank" rel="noopener noreferrer" data-site-content>
    ${friendAvatar(site)}
    <div class="friend-card-copy">
      <h2 class="friend-name">${escapeHtml(site.name)}</h2>
      <span class="friend-domain">${escapeHtml(new URL(site.href).hostname)}</span>
      ${site.description ? `<p class="friend-description">${escapeHtml(site.description)}</p>` : ''}
    </div>
  </a>`).join('');
}

async function initGuestbook(host) {
  guestbookState.host = host;
  await initGuestbookAuth();
  renderGuestbookShell(host);
  bindGuestbookForm(host);
  loadGuestbookMessages(host, { announce: true });
  stopGuestbookPolling();
  if (guestbookState.config.enabled) {
    guestbookState.pollTimer = window.setInterval(() => {
      loadGuestbookMessages(host);
    }, GUESTBOOK_REMOTE_POLL_MS);
  }
}

function renderGuestbookShell(host) {
  const profile = guestbookState.profile;
  host.innerHTML = `
    <section class="guestbook-panel" aria-labelledby="guestbook-title">
      <div class="guestbook-head">
        <div>
          <h2 id="guestbook-title" class="guestbook-title">留言</h2>
          <p class="guestbook-subtitle">${guestbookState.config.authProviders.length || guestbookState.config.emailAuth
            ? '可以匿名留言，也可以登录后用昵称留言；邮箱不会公开展示。'
            : '无需登录即可留言；取消“公开展示”后，仅站主可见。'}</p>
        </div>
        <button id="guestbook-refresh" class="icon-link guestbook-refresh" type="button">刷新</button>
      </div>

      <div id="guestbook-auth" class="guestbook-auth">${renderGuestbookAuth()}</div>

      <form id="guestbook-form" class="guestbook-form">
        <label class="guestbook-field">
          <span class="guestbook-label">留言</span>
          <textarea
            id="guestbook-body"
            class="guestbook-textarea"
            rows="4"
            maxlength="1200"
            placeholder="写点什么。Ctrl + Enter 发送。"
            required
          ></textarea>
        </label>

        <div class="guestbook-options">
          <label class="guestbook-check">
            <input id="guestbook-anonymous" type="checkbox" ${profile.anonymous ? 'checked' : ''}>
            <span>匿名显示</span>
          </label>
          <label class="guestbook-check">
            <input id="guestbook-public" type="checkbox" ${profile.public ? 'checked' : ''}>
            <span>公开展示</span>
          </label>
        </div>

        <div class="guestbook-actions">
          <div id="guestbook-status" class="guestbook-status" role="status"></div>
          <button class="secret-submit guestbook-submit" type="submit">发送</button>
        </div>
      </form>

      <div class="guestbook-list-head">
        <div class="guestbook-list-title">公开留言</div>
        <div class="guestbook-list-note">非公开留言不会显示在这里。</div>
      </div>
      <div id="guestbook-list" class="guestbook-list" aria-live="polite"></div>
    </section>
  `;
}

function renderGuestbookAuth() {
  if (!guestbookState.config.enabled) {
    return `
      <div class="guestbook-auth-copy">
        <div class="guestbook-auth-title">匿名模式</div>
        <div class="guestbook-auth-note">远程留言服务未配置，登录暂不可用。</div>
      </div>
    `;
  }

  if (!guestbookState.config.authProviders.length && !guestbookState.config.emailAuth) {
    return '';
  }

  if (!guestbookState.authReady) {
    return `
      <div class="guestbook-auth-copy">
        <div class="guestbook-auth-title">正在读取登录状态</div>
        <div class="guestbook-auth-note">匿名留言不受影响。</div>
      </div>
    `;
  }

  const emailLogin = guestbookState.emailLogin;
  const emailExpanded = emailLogin.expanded;
  const feedback = `<div class="guestbook-auth-feedback" role="status"><span class="guestbook-auth-error">${escapeHtml(guestbookState.authError)}</span><span class="guestbook-auth-note">${escapeHtml(emailLogin.notice)}</span></div>`;
  if (guestbookState.user) {
    const identity = getGuestbookIdentity(false);
    const avatar = identity.avatarUrl
      ? `<img class="guestbook-avatar" src="${escapeAttr(identity.avatarUrl)}" alt="">`
      : '<span class="guestbook-avatar is-placeholder"></span>';
    return `
      <div class="guestbook-auth-user">
        ${avatar}
        <div class="guestbook-auth-copy">
          <div class="guestbook-auth-title">${escapeHtml(identity.displayName)}</div>
          <div class="guestbook-auth-note">${escapeHtml(identity.providerLabel)} 已登录</div>
        </div>
      </div>
      <button id="guestbook-logout" class="icon-link" type="button" ${emailLogin.busy ? 'disabled' : ''}>退出登录</button>
      ${identity.provider === 'email' ? `<form id="guestbook-nickname-form" class="guestbook-email-form">
        <label class="guestbook-field"><span class="guestbook-label">公开昵称</span><input name="nickname" class="guestbook-input" maxlength="40" autocomplete="nickname" value="${escapeAttr(guestbookState.user.user_metadata?.display_name || '')}" required></label>
        <button class="icon-link" type="submit" ${emailLogin.busy ? 'disabled' : ''}>保存昵称</button>
        <p class="guestbook-auth-note">取消“匿名显示”后，留言将展示此昵称。</p>
      </form>` : ''}
      ${feedback}
    `;
  }

  return `
    <div class="guestbook-auth-copy">
      <div class="guestbook-auth-title">登录后留下身份</div>
      <div class="guestbook-auth-note">也可以继续匿名留言。</div>
    </div>
    <div class="guestbook-auth-methods" role="group" aria-label="选择登录方式">
      ${guestbookState.config.authProviders.map((provider) => `
        <button class="icon-link guestbook-login" type="button" data-provider="${provider}" ${emailLogin.busy ? 'disabled' : ''}>${providerLabelFromId(provider)} 登录</button>
      `).join('')}
      ${guestbookState.config.emailAuth ? `<button id="guestbook-email-toggle" class="icon-link" type="button" aria-expanded="${Boolean(emailExpanded)}" aria-controls="guestbook-email-form" ${emailLogin.busy ? 'disabled' : ''}>邮箱登录</button>` : ''}
    </div>
    ${guestbookState.config.emailAuth ? `<form id="guestbook-email-form" class="guestbook-email-form" ${emailExpanded ? '' : 'hidden'}>
      <label class="guestbook-field"><span class="guestbook-label">邮箱</span><input name="email" type="email" class="guestbook-input" autocomplete="email" value="${escapeAttr(emailLogin.email)}" ${emailLogin.sent ? 'readonly' : ''} required></label>
      ${emailLogin.sent ? `<label class="guestbook-field"><span class="guestbook-label">验证码</span><input name="token" class="guestbook-input" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" minlength="6" maxlength="10" required></label>` : ''}
      <div class="guestbook-auth-actions"><button class="icon-link" type="submit" ${emailLogin.busy ? 'disabled' : ''}>${emailLogin.busy ? '处理中…' : emailLogin.sent ? '验证并登录' : '发送验证码'}</button>
      ${emailLogin.sent ? `<button id="guestbook-email-change" class="icon-link" type="button" ${emailLogin.busy ? 'disabled' : ''}>更换邮箱或重新发送</button>` : ''}</div>
    </form>` : ''}
    ${feedback}
  `;
}

function bindGuestbookForm(host) {
  const form = host.querySelector('#guestbook-form');
  const refreshButton = host.querySelector('#guestbook-refresh');
  const textarea = host.querySelector('#guestbook-body');

  textarea?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      form?.requestSubmit();
    }
  });

  refreshButton?.addEventListener('click', () => {
    loadGuestbookMessages(host, { announce: true });
  });

  bindGuestbookAuthControls(host);

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitGuestbookMessage(host);
  });
}

function bindGuestbookAuthControls(host) {
  host.querySelector('#guestbook-email-toggle')?.addEventListener('click', () => {
    const state = guestbookState.emailLogin;
    state.expanded = !state.expanded;
    updateGuestbookAuthUi();
    host.querySelector(state.expanded ? '#guestbook-email-form input' : '#guestbook-email-toggle')?.focus();
  });
  host.querySelector('#guestbook-email-form input[name="email"]')?.addEventListener('input', (event) => {
    guestbookState.emailLogin.email = event.target.value;
  });
  host.querySelector('#guestbook-email-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    signInGuestbookEmail(form.elements.email.value, form.elements.token?.value || '');
  });
  host.querySelector('#guestbook-email-change')?.addEventListener('click', () => {
    guestbookState.emailLogin.sent = false;
    guestbookState.emailLogin.notice = '';
    guestbookState.authError = '';
    updateGuestbookAuthUi();
  });
  host.querySelector('#guestbook-nickname-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    saveGuestbookNickname(event.currentTarget.elements.nickname.value);
  });
  host.querySelectorAll('.guestbook-login').forEach((button) => {
    button.addEventListener('click', () => {
      signInGuestbook(String(button.dataset.provider || 'github'));
    });
  });

  host.querySelector('#guestbook-logout')?.addEventListener('click', async () => {
    await signOutGuestbook();
    renderGuestbookShell(host);
    bindGuestbookForm(host);
    loadGuestbookMessages(host);
  });
}

async function initGuestbookAuth() {
  if (guestbookState.authReady) {
    return;
  }

  try {
    guestbookState.authClient = createGuestbookAuthClient();
    if (!guestbookState.authClient) {
      guestbookState.authReady = true;
      return;
    }

    const { data, error } = await guestbookState.authClient.auth.getSession();
    if (error) {
      throw error;
    }
    guestbookState.session = data?.session || null;
    guestbookState.user = guestbookState.session?.user || null;
    guestbookState.authClient.auth.onAuthStateChange((_event, session) => {
      guestbookState.session = session || null;
      guestbookState.user = session?.user || null;
      updateGuestbookAuthUi();
    });
  } catch (error) {
    guestbookState.authError = formatGuestbookError(error);
  } finally {
    guestbookState.authReady = true;
  }
}

function createGuestbookAuthClient() {
  if (!guestbookState.config.enabled || (!guestbookState.config.authProviders.length && !guestbookState.config.emailAuth) || !window.supabase?.createClient) {
    return null;
  }
  return window.supabase.createClient(
    guestbookState.config.supabaseUrl,
    guestbookState.config.supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );
}

async function signInGuestbook(provider) {
  try {
    if (!guestbookState.authClient) {
      guestbookState.authClient = createGuestbookAuthClient();
    }
    if (!guestbookState.authClient) {
      throw new Error('Supabase Auth is not available.');
    }
    const { error } = await guestbookState.authClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
        ...(provider === 'azure' ? { scopes: 'email' } : {}),
      },
    });
    if (error) {
      throw error;
    }
  } catch (error) {
    guestbookState.authError = formatGuestbookError(error);
    updateGuestbookAuthUi();
  }
}

async function signInGuestbookEmail(email, token = '') {
  const state = guestbookState.emailLogin;
  if (state.busy) return;
  state.email = String(email).trim();
  state.expanded = true;
  state.busy = true;
  state.notice = '';
  guestbookState.authError = '';
  updateGuestbookAuthUi();
  try {
    guestbookState.authClient ||= createGuestbookAuthClient();
    if (!guestbookState.authClient) throw new Error('登录暂不可用，请稍后重试。');
    if (state.sent) {
      const { data, error } = await guestbookState.authClient.auth.verifyOtp({ email: state.email, token: token.trim(), type: 'email' });
      if (error) throw error;
      if (!data?.session) throw new Error('登录暂不可用，请稍后重试。');
      guestbookState.session = data.session;
      guestbookState.user = data.session.user;
      state.sent = false;
      state.email = '';
    } else {
      const { error } = await guestbookState.authClient.auth.signInWithOtp({ email: state.email, options: { shouldCreateUser: true } });
      if (error) throw error;
      state.sent = true;
      state.notice = '验证码已发送，请查收邮件。';
    }
  } catch (error) {
    guestbookState.authError = formatGuestbookError(error);
  } finally {
    state.busy = false;
    updateGuestbookAuthUi();
  }
}

async function saveGuestbookNickname(value) {
  const nickname = String(value).trim();
  if (guestbookState.emailLogin.busy) return;
  guestbookState.authError = '';
  guestbookState.emailLogin.notice = '';
  if (!nickname || nickname.length > 40) {
    guestbookState.authError = '昵称请填写 1–40 个字符。';
    updateGuestbookAuthUi();
    return;
  }
  guestbookState.emailLogin.busy = true;
  updateGuestbookAuthUi();
  try {
    const { data, error } = await guestbookState.authClient.auth.updateUser({ data: { display_name: nickname } });
    if (error) throw error;
    guestbookState.user = data.user;
    guestbookState.emailLogin.notice = '昵称已保存。';
  } catch (error) {
    guestbookState.authError = formatGuestbookError(error);
  } finally {
    guestbookState.emailLogin.busy = false;
    updateGuestbookAuthUi();
  }
}

async function signOutGuestbook() {
  try {
    if (guestbookState.authClient) {
      await guestbookState.authClient.auth.signOut();
    }
  } catch (_error) {
    // Keep the local UI usable even if sign-out fails remotely.
  }
  guestbookState.session = null;
  guestbookState.user = null;
  guestbookState.emailLogin = { email: '', sent: false, busy: false, notice: '', expanded: false };
  guestbookState.authError = '';
  updateGuestbookAuthUi();
}

function updateGuestbookAuthUi() {
  const host = guestbookState.host;
  const authHost = host?.querySelector('#guestbook-auth');
  if (!authHost) {
    return;
  }
  authHost.innerHTML = renderGuestbookAuth();
  bindGuestbookAuthControls(host);
}

async function submitGuestbookMessage(host) {
  const status = host.querySelector('#guestbook-status');
  const bodyInput = host.querySelector('#guestbook-body');
  const anonymousInput = host.querySelector('#guestbook-anonymous');
  const publicInput = host.querySelector('#guestbook-public');
  const submitButton = host.querySelector('.guestbook-submit');

  const body = String(bodyInput?.value || '').trim();
  const isAnonymous = Boolean(anonymousInput?.checked);
  const isPublic = Boolean(publicInput?.checked);
  const identity = getGuestbookIdentity(isAnonymous);

  if (!body) {
    setGuestbookStatus(status, '留言不能为空。', true);
    return;
  }

  guestbookState.profile = { anonymous: isAnonymous, public: isPublic };
  writeGuestbookProfile(guestbookState.profile);

  const payload = {
    id: generateGuestbookId(),
    auth_user_id: identity.userId,
    auth_provider: identity.provider,
    author_name: identity.publicName.slice(0, 40),
    avatar_url: identity.publicAvatarUrl.slice(0, 500),
    body: body.slice(0, 1200),
    is_public: isPublic,
    created_at: new Date().toISOString(),
  };

  submitButton.disabled = true;
  setGuestbookStatus(status, '正在发送…');

  try {
    await insertGuestbookMessage(payload);
    if (bodyInput) {
      bodyInput.value = '';
    }
    setGuestbookStatus(status, isPublic ? '已发送并公开显示。' : '已发送，只会由站点主人查看。');
    await loadGuestbookMessages(host);
  } catch (error) {
    setGuestbookStatus(status, `发送失败：${formatGuestbookError(error)}`, true);
  } finally {
    submitButton.disabled = false;
  }
}

async function loadGuestbookMessages(host, options = {}) {
  const list = host.querySelector('#guestbook-list');
  const status = host.querySelector('#guestbook-status');
  if (!list) {
    return;
  }

  if (!guestbookState.config.enabled) {
    list.innerHTML = '<div class="guestbook-empty">留言服务暂时不可用。</div>';
    setGuestbookStatus(status, '留言服务暂时不可用。', true);
    return;
  }

  if (options.announce) {
    list.innerHTML = '<div class="guestbook-empty">正在加载公开留言…</div>';
  }

  try {
    const messages = await fetchGuestbookMessages();
    renderGuestbookMessages(list, messages);
    if (options.announce) {
      setGuestbookStatus(status, messages.length ? `已加载 ${messages.length} 条公开留言。` : '还没有公开留言。');
    }
  } catch (error) {
    const message = formatGuestbookError(error);
    list.innerHTML = `<div class="guestbook-empty is-error">无法加载公开留言：${escapeHtml(message)}</div>`;
    setGuestbookStatus(status, `加载失败：${message}`, true);
  }
}

function renderGuestbookMessages(list, messages) {
  if (!messages.length) {
    list.innerHTML = '<div class="guestbook-empty">还没有公开留言。</div>';
    return;
  }

  list.innerHTML = messages.map((message) => {
    const author = message.author_name ? message.author_name : '匿名访客';
    const avatar = message.avatar_url
      ? `<img class="guestbook-item-avatar" src="${escapeAttr(message.avatar_url)}" alt="">`
      : '<span class="guestbook-item-avatar is-placeholder"></span>';
    return `
      <article class="guestbook-item">
        <div class="guestbook-item-head">
          <div class="guestbook-author-line">
            ${avatar}
            <span class="guestbook-author">${escapeHtml(author)}</span>
          </div>
          <time class="guestbook-time" datetime="${escapeAttr(message.created_at)}">${escapeHtml(formatShanghaiTimestamp(message.created_at))}</time>
        </div>
        <div class="guestbook-body">${escapeHtml(message.body)}</div>
      </article>
    `;
  }).join('');
}

async function fetchGuestbookMessages() {
  const response = await fetch(buildGuestbookSelectEndpoint(), {
    method: 'GET',
    headers: buildGuestbookHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Supabase read failed (${response.status})`);
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows.map(normalizeGuestbookMessage).filter(Boolean) : [];
}

async function insertGuestbookMessage(payload) {
  if (!guestbookState.config.enabled) {
    throw new Error('Supabase is not configured.');
  }

  const response = await fetch(buildGuestbookTableEndpoint(), {
    method: 'POST',
    headers: {
      ...buildGuestbookHeaders(),
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Supabase write failed (${response.status})${detail ? ` ${detail.slice(0, 120)}` : ''}`);
  }
}

function normalizeGuestbookMessage(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const id = String(row.id || '');
  const body = String(row.body || '').trim();
  if (!id || !body) {
    return null;
  }
  return {
    id,
    author_name: String(row.author_name || '').trim(),
    avatar_url: String(row.avatar_url || '').trim(),
    body,
    created_at: String(row.created_at || ''),
  };
}

function buildGuestbookTableEndpoint() {
  return `${guestbookState.config.supabaseUrl}/rest/v1/guestbook_messages`;
}

function buildGuestbookSelectEndpoint() {
  const columns = 'id,author_name,avatar_url,body,created_at';
  return `${buildGuestbookTableEndpoint()}?select=${columns}&is_public=eq.true&order=created_at.desc&limit=30`;
}

function buildGuestbookHeaders() {
  const token = guestbookState.session?.access_token;
  return {
    apikey: guestbookState.config.supabaseAnonKey,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Cache-Control': 'no-cache',
  };
}

function normalizeGuestbookConfig(config) {
  const raw = config && typeof config === 'object' ? config : {};
  const supabaseUrl = String(raw.supabaseUrl || '').trim().replace(/\/+$/, '');
  const supabaseAnonKey = String(raw.supabaseAnonKey || '').trim();
  return {
    supabaseUrl,
    supabaseAnonKey,
    authProviders: Array.isArray(raw.authProviders)
      ? [...new Set(raw.authProviders.filter((provider) => ['github', 'google', 'azure', 'discord'].includes(provider)))]
      : [],
    emailAuth: raw.emailAuth === true,
    enabled: Boolean(supabaseUrl && supabaseAnonKey),
  };
}

function getGuestbookIdentity(isAnonymous) {
  const user = guestbookState.user;
  if (!user) {
    return {
      userId: null,
      provider: '',
      providerLabel: 'anonymous',
      displayName: '匿名访客',
      avatarUrl: '',
      publicName: '',
      publicAvatarUrl: '',
    };
  }

  const metadata = user.user_metadata || {};
  const appMetadata = user.app_metadata || {};
  const recentIdentity = [...(user.identities || [])].sort((a, b) =>
    (Date.parse(b.last_sign_in_at) || 0) - (Date.parse(a.last_sign_in_at) || 0))[0];
  const provider = String(recentIdentity?.provider || appMetadata.provider || '').trim();
  const providerLabel = provider ? providerLabelFromId(provider) : 'third-party';
  const displayName = [metadata.display_name, metadata.user_name, metadata.full_name,
    metadata.name, metadata.preferred_username]
    .map((name) => String(name || '').trim())
    .find((name) => name && !name.includes('@')) || '已登录访客';
  const avatarUrl = String(metadata.avatar_url || metadata.picture || '').trim();

  return {
    userId: user.id || null,
    provider,
    providerLabel,
    displayName,
    avatarUrl,
    publicName: isAnonymous ? '' : displayName,
    publicAvatarUrl: isAnonymous ? '' : avatarUrl,
  };
}

function providerLabelFromId(provider) {
  const labels = {
    github: 'GitHub',
    google: 'Google',
    azure: 'Microsoft',
    discord: 'Discord',
    email: 'Email',
  };
  return labels[provider] || provider;
}

function readGuestbookProfile() {
  try {
    const raw = localStorage.getItem(GUESTBOOK_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        anonymous: Boolean(parsed.anonymous),
        public: parsed.public !== false,
      };
    }
  } catch (_error) {
    // Ignore invalid profile cache.
  }
  return { name: '', anonymous: true, public: true };
}

function writeGuestbookProfile(profile) {
  try {
    localStorage.setItem(GUESTBOOK_CACHE_KEY, JSON.stringify(profile));
  } catch (_error) {
    // Ignore persistence failures.
  }
}

function setGuestbookStatus(host, text, isError = false) {
  if (!host) {
    return;
  }
  host.textContent = text || '';
  host.classList.toggle('is-error', Boolean(isError));
}

function formatGuestbookError(error) {
  const message = String(error?.message || error || '').trim();
  if (!message || error?.name === 'TypeError' || error?.name === 'NetworkError') {
    return '留言服务暂时不可用。';
  }
  return message;
}

function stopGuestbookPolling() {
  if (guestbookState.pollTimer) {
    window.clearInterval(guestbookState.pollTimer);
    guestbookState.pollTimer = null;
  }
}

function generateGuestbookId() {
  const random = new Uint8Array(8);
  crypto.getRandomValues(random);
  return `guest-${Date.now()}-${Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

async function initViewerPage() {
  const url = new URL(window.location.href);
  if (url.searchParams.has('project')) {
    await loadProjectViewer(url.searchParams.get('project'));
    return;
  }
  const docInput = url.searchParams.get('doc') || DEFAULT_DOCUMENT_PATH;
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
    subtitleHost.textContent = ['minors', 'invisible', 'tech'].includes(resolved?.category) ? CATEGORY_DEFINITIONS[resolved.category].title : resolved?.path || docInput;
  }
  if (host) {
    if (String(docInput).replace(/^[./]+/, '').toLowerCase().startsWith('everlasting/research/')) {
      host.innerHTML = '<div class="error-state">This document is not publicly available.</div>';
      return;
    }
    await loadMarkdownInto(host, rootAssetPath(resolved?.path || docInput), {
      linkScope: 'doc',
      outline: true,
    });
    if (resolved?.category) {
      let returnUrl = categoryHref(resolved.category);
      try {
        const from = new URL(url.searchParams.get('from') || returnUrl, window.location.origin);
        if (from.origin === window.location.origin && from.pathname === '/category.html' && from.searchParams.get('cat') === resolved.category) {
          returnUrl = from.pathname + from.search;
        }
      } catch { /* Use the category's default URL. */ }
      host.insertAdjacentHTML('afterbegin', `<div class="article-return"><a href="${escapeAttr(returnUrl)}">← 返回${escapeHtml(CATEGORY_DEFINITIONS[resolved.category].title)}列表</a></div>`);
      if (['minors', 'invisible', 'tech'].includes(resolved.category)) {
        window.ArticleLibrary.enhanceReader(host, resolved, returnUrl, CATEGORY_DEFINITIONS[resolved.category]);
      }
      scrollToDocumentHash(host);
    }
  }
}

async function initCategoryPage() {
  const url = new URL(window.location.href);
  if (url.searchParams.get('cat') === 'annual') {
    url.searchParams.set('cat', 'minors');
    url.searchParams.set('collection', 'annual');
    window.history.replaceState(null, '', url);
  }
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
    subtitleHost.textContent = ['minors', 'invisible', 'tech'].includes(category.id) ? '文章与笔记' : category.description;
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

  await loadCategoryInto(host, category);
}

async function loadCategoryInto(host, category) {
  if (['minors', 'invisible', 'tech'].includes(category.id)) {
    await window.ArticleLibrary.mount(host, category);
    return;
  }
  if (category.id === 'permanence') {
    await loadProjectsInto(host);
    return;
  }
  if (category.id === 'papers') {
    const compact = host.classList.contains('home-category-viewport');
    if (!compact) host.closest('.page-shell')?.classList.add('paper-page-shell');
    await window.PaperTree.mount(host, { compact, description: category.description });
    return;
  }
  host.innerHTML = '<div class="loading-state">Loading category...</div>';
  if (category.groups?.length) {
    const groups = await Promise.all(category.groups.map(async (group) => ({
      ...group,
      docs: await loadCategoryDocEntries(group.docs, category.id),
    })));
    host.innerHTML = renderTechCategoryLayout(category, groups);
  } else {
    const docs = await loadCategoryDocs(category);
    host.innerHTML = renderCategoryLayout(category, docs);
  }
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

    for (let offset = totalDays; offset >= 0; offset -= 1) {
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

    host.innerHTML = `<div class="history-list">${items.join('')}</div>`;
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
    const html = renderMarkdown(text, {
      ...options,
      basePath: path,
    });
    host.innerHTML = html || '<div class="loading-state">No content found.</div>';
    if (options.outline) host.insertAdjacentHTML('afterbegin', renderDocumentOutline(html));
    enhanceMarkdownHost(host);
    if (options.outline) scrollToDocumentHash(host);
  } catch (error) {
    host.innerHTML = '<div class="error-state">暂时无法加载这篇文档，请稍后重试。</div>';
  }
}

async function loadCategoryDocs(category) {
  const docs = await Promise.all(
    category.docs.map(async (entry) => {
      if (typeof entry === 'object' && entry?.type === 'category') {
        return loadCategoryPreview(entry.id);
      }

      const path = entry;
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
        let preview = renderMarkdown(text, {
          maxBlocks: 4,
          linkScope: 'doc',
          basePath: rootAssetPath(doc.path),
        });
        if (doc.outlinePreview) {
          preview = renderDocumentOutline(renderMarkdown(text), viewerHref(doc.path)) + preview;
        }
        return {
          ...doc,
          type: 'doc',
          preview,
          missing: false,
        };
      } catch (_error) {
        return {
          ...doc,
          type: 'doc',
          preview: '<div class="loading-state">Preview unavailable.</div>',
          missing: true,
        };
      }
    }),
  );

  return docs;
}

async function loadCategoryDocEntries(entries, categoryId) {
  const docs = await Promise.all(
    entries.map(async (entry) => {
      if (typeof entry === 'object' && entry?.type === 'category') {
        return loadCategoryPreview(entry.id);
      }

      const path = entry;
      const doc = resolveDoc(path) || {
        path,
        title: displayNameFromPath(path),
        category: categoryId,
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
          basePath: rootAssetPath(doc.path),
        });
        return {
          ...doc,
          type: 'doc',
          preview,
          missing: false,
        };
      } catch (_error) {
        return {
          ...doc,
          type: 'doc',
          preview: '<div class="loading-state">Preview unavailable.</div>',
          missing: true,
        };
      }
    }),
  );

  return docs;
}

async function loadCategoryPreview(categoryId) {
  const category = CATEGORY_DEFINITIONS[categoryId];
  if (!category) {
    return {
      type: 'category',
      title: displayNameFromPath(categoryId),
      categoryId,
      preview: '<div class="loading-state">Preview unavailable.</div>',
      missing: true,
    };
  }

  const previewParts = [];
  for (const path of category.docs.slice(0, 2)) {
    if (typeof path !== 'string') {
      continue;
    }
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
        maxBlocks: 2,
        linkScope: 'doc',
        basePath: rootAssetPath(doc.path),
      });
      previewParts.push(`
        <section class="category-child-preview">
          <div class="category-child-preview-title">${escapeHtml(doc.title)}</div>
          ${preview}
        </section>
      `);
    } catch (_error) {
      previewParts.push(`
        <section class="category-child-preview">
          <div class="category-child-preview-title">${escapeHtml(doc.title)}</div>
          <div class="loading-state">Preview unavailable.</div>
        </section>
      `);
    }
  }

  return {
    type: 'category',
    title: category.title,
    categoryId: category.id,
    description: category.description,
    preview: previewParts.join('') || '<div class="loading-state">Preview unavailable.</div>',
    missing: false,
  };
}

function renderCategoryLayout(category, docs) {
  return `
    <header class="category-intro">
      <h2 class="category-intro-title">${escapeHtml(category.title)}</h2>
      <p class="category-intro-copy">${escapeHtml(category.description)}</p>
    </header>
    <section class="doc-card-list">${renderDocCards(docs, category)}</section>
  `;
}

function renderTechCategoryLayout(category, groups) {
  const [primaryGroup, ...secondaryGroups] = groups;
  const primaryCards = primaryGroup ? renderDocCards(primaryGroup.docs, category) : '';
  const secondarySections = secondaryGroups.map((group) => `
    <section class="category-subsection">
      <div class="category-subsection-head">
        <div class="category-subsection-title">${escapeHtml(group.title)}</div>
        <div class="category-subsection-copy">${escapeHtml(group.description)}</div>
      </div>
      <div class="doc-card-list">${renderDocCards(group.docs, category)}</div>
    </section>
  `).join('');

  return `
    <header class="category-intro">
      <h2 class="category-intro-title">${escapeHtml(category.title)}</h2>
      <p class="category-intro-copy">${escapeHtml(category.description)}</p>
    </header>
    <section class="doc-card-list">${primaryCards}</section>
    ${secondarySections}
  `;
}

function renderDocCards(docs, category) {
  return docs.map((doc) => {
    const missingClass = doc.missing ? ' is-missing' : '';
    const isCategory = doc.type === 'category';
    const href = isCategory ? categoryHref(doc.categoryId) : viewerHref(doc.path);
    const meta = isCategory
      ? `${escapeHtml(category.title)} / ${escapeHtml(doc.description || 'subdirectory')}`
      : doc.hidePath ? escapeHtml(category.title) : `${escapeHtml(category.title)} / ${escapeHtml(basename(doc.path))}`;
    return `
      <article class="doc-card${missingClass}${isCategory ? ' is-category' : ''}">
        <div class="doc-card-head">
          <div>
            <div class="doc-card-title">
              <a class="doc-link" href="${href}">${escapeHtml(doc.title)}</a>
            </div>
            <div class="doc-card-meta">${meta}</div>
          </div>
          <a class="icon-link doc-open" href="${href}">Open</a>
        </div>
        <div class="doc-card-body markdown-body">${doc.preview}</div>
      </article>
    `;
  }).join('');
}

// Build the outline from rendered headings, so code-block comments never become entries.
function renderDocumentOutline(html, linkBase = '') {
  const content = document.createElement('div');
  content.innerHTML = html;
  const headings = Array.from(content.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  if (!headings.length) return '';
  const root = document.createElement('ol');
  const stack = [{ level: 0, list: root, item: null }];
  for (const heading of headings) {
    const level = Number(heading.tagName.slice(1));
    while (stack.length > 1 && level <= stack[stack.length - 1].level) stack.pop();
    const parent = stack[stack.length - 1];
    let list = parent.list;
    if (parent.item) {
      list = parent.item.querySelector(':scope > ol');
      if (!list) {
        list = document.createElement('ol');
        parent.item.append(list);
      }
    }
    const item = document.createElement('li');
    const anchor = document.createElement('a');
    anchor.href = `${linkBase}#${encodeURIComponent(heading.id)}`;
    anchor.textContent = heading.textContent;
    item.append(anchor);
    list.append(item);
    stack.push({ level, list, item });
  }
  return `<details class="document-outline" open><summary>文章目录</summary><nav aria-label="文章目录">${root.outerHTML}</nav></details>`;
}

function scrollToDocumentHash(host) {
  let id;
  try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
  if (!id) return;
  const target = Array.from(host.querySelectorAll('[id]')).find((element) => element.id === id);
  target?.scrollIntoView({ block: 'start' });
}

let projectsPromise;
function loadProjects() {
  if (!projectsPromise) {
    projectsPromise = fetch('/assets/projects/index.json', { cache: 'no-cache' }).then((response) => {
      if (!response.ok) throw new Error('暂时无法加载项目介绍，请稍后重试。');
      return response.json();
    }).then((data) => data.projects).catch((error) => { projectsPromise = null; throw error; });
  }
  return projectsPromise;
}

function projectHref(id) {
  return `/viewer.html?project=${encodeURIComponent(id)}`;
}

function renderProjectReadme(project, headingPrefix = '') {
  return renderMarkdown(project.markdown, {
    basePath: project.assetBase,
    linkBase: project.linkBase,
    headingPrefix,
  });
}

async function loadProjectsInto(host) {
  host.innerHTML = '<div class="loading-state">正在加载项目介绍…</div>';
  try {
    const projects = await loadProjects();
    await window.ArticleLibrary.mount(host, projectCategory(projects), projects.map((project) => ({
      ...window.ArticleLibrary.summarize(project.markdown),
      path: project.id, title: project.title, href: projectHref(project.id),
      repository: project.repository, group: '', groupTitle: 'README',
    })));
  } catch (error) {
    host.innerHTML = `<div class="error-state">${escapeHtml(error.message)}</div>`;
  }
}

function projectCategory(projects) {
  return { ...CATEGORY_DEFINITIONS.permanence, entries: projects.map((project) => ({
    path: project.id, title: project.title, href: projectHref(project.id),
  })) };
}

async function loadProjectViewer(id) {
  const host = document.getElementById('viewer-article');
  const title = document.getElementById('viewer-title');
  const subtitle = document.getElementById('viewer-subtitle');
  host.innerHTML = '<div class="loading-state">正在加载项目介绍…</div>';
  try {
    const projects = await loadProjects();
    const project = projects.find((item) => item.id === id);
    if (!project) throw new Error('未找到这个项目。');
    document.title = `${project.title} | assassinlike`;
    title.textContent = project.title;
    subtitle.textContent = '开源项目';
    const html = renderProjectReadme(project);
    let returnUrl = categoryHref('permanence');
    try {
      const from = new URL(new URL(location.href).searchParams.get('from') || returnUrl, location.origin);
      if (from.origin === location.origin && from.pathname === '/category.html' && from.searchParams.get('cat') === 'permanence') returnUrl = from.pathname + from.search;
    } catch { /* Keep the default list URL. */ }
    host.innerHTML = `<div class="article-return"><a href="${escapeAttr(returnUrl)}">← 返回开源项目列表</a></div>${renderDocumentOutline(html)}${html}`;
    window.ArticleLibrary.enhanceReader(host, { path: project.id, title: project.title }, returnUrl, projectCategory(projects));
    if (project.repository) host.querySelector('.library-reader-head').insertAdjacentHTML('beforeend', `<a class="library-repository" href="${escapeAttr(project.repository)}" target="_blank" rel="noopener noreferrer">GitHub 仓库 ↗</a>`);
    enhanceMarkdownHost(host);
    scrollToDocumentHash(host);
  } catch (error) {
    host.innerHTML = `<div class="error-state">${escapeHtml(error.message)}</div>`;
  }
}

function markdownTableCells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function renderMarkdown(source, options = {}) {
  const lines = normalizeLineBreaks(source).split('\n');
  const blocks = [];
  const headingIds = new Set();
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

    if (compact.startsWith('$$')) {
      const mathLines = [];
      const firstLine = compact.slice(2);
      if (firstLine.trim().endsWith('$$') && firstLine.trim().length > 2) {
        mathLines.push(firstLine.replace(/\$\$\s*$/, ''));
        i += 1;
      } else {
        if (firstLine) {
          mathLines.push(firstLine);
        }
        i += 1;
        while (i < lines.length) {
          const mathLine = lines[i].trimEnd();
          if (mathLine.trim().endsWith('$$')) {
            mathLines.push(mathLine.replace(/\$\$\s*$/, ''));
            i += 1;
            break;
          }
          mathLines.push(mathLine);
          i += 1;
        }
      }
      blocks.push(`<div class="math-display"><span class="math-source">$$\n${escapeHtml(mathLines.join('\n').trim())}\n$$</span></div>`);
      continue;
    }

    if (isHeading(compact)) {
      const match = compact.match(/^(#{1,6})\s+(.*)$/);
      const level = match[1].length;
      const text = match[2].trim();
      const baseId = slugify(text);
      let headingId = baseId;
      let suffix = 1;
      while (headingIds.has(headingId)) headingId = `${baseId}-${suffix++}`;
      headingIds.add(headingId);
      blocks.push(`<h${level} id="${escapeAttr((options.headingPrefix || '') + headingId)}">${parseInline(text, options)}</h${level}>`);
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
      blocks.push(`<blockquote>${paragraphify(quote, options)}</blockquote>`);
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length) {
      const separators = markdownTableCells(lines[i + 1]);
      const headers = markdownTableCells(line);
      if (headers.length === separators.length && separators.every((cell) => /^:?-{3,}:?$/.test(cell))) {
        const rows = [];
        i += 2;
        while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
          const cells = markdownTableCells(lines[i++]);
          rows.push(`<tr>${headers.map((_, column) => `<td>${parseInline(cells[column] || '', options)}</td>`).join('')}</tr>`);
        }
        blocks.push(`<div class="md-table-scroll"><table><thead><tr>${headers.map((cell) => `<th>${parseInline(cell, options)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`);
        continue;
      }
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

        items.push(`<li>${paragraphify(itemLines, options)}</li>`);
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

    blocks.push(`<p>${paragraphify(paragraphLines, options)}</p>`);
  }

  const body = blocks.join('\n');
  const scope = options.linkScope || 'none';
  const patterns = buildTextPatterns(scope);
  return patterns.length ? autoLinkText(body, patterns) : body;
}

function paragraphify(lines, options = {}) {
  const text = lines.map((line) => line.trimEnd()).join('\n');
  return parseInline(text, options);
}

function parseInline(text, options = {}) {
  const placeholders = [];
  let working = String(text);

  working = working.replace(/<a\s+id=(['"])([^'"]+)\1\s*><\/a>/gi, (_, _quote, id) => {
    const token = `%%ANCHOR${placeholders.length}%%`;
    placeholders.push(`<a id="${escapeHtml(id)}"></a>`);
    return token;
  });

  working = working.replace(/`([^`]+)`/g, (_, code) => {
    const token = `%%CODE${placeholders.length}%%`;
    placeholders.push(`<code>${escapeHtml(code)}</code>`);
    return token;
  });

  working = protectMathSegments(working, placeholders);

  working = escapeHtml(working);
  working = working.replace(/\n/g, '<br>');

  working = working.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const cleanSrc = src.trim();
    const resolvedSrc = resolveMarkdownAssetSrc(cleanSrc, options.basePath);
    const altText = alt.trim();
    return `<figure class="md-image"><img src="${escapeAttr(resolvedSrc)}" alt="${escapeAttr(altText)}" loading="lazy" decoding="async" onerror="this.parentElement.remove()"></figure>`;
  });

  working = working.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const target = href.trim();
    const resolved = target.startsWith('#') && options.headingPrefix
      ? '#' + options.headingPrefix + target.slice(1)
      : options.linkBase && !/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)
        ? new URL(target, options.linkBase).href : resolveLinkHref(target);
    if (!/^(?:https?:|mailto:|tel:|\/|#)/i.test(resolved) && /^[a-z][a-z0-9+.-]*:/i.test(resolved)) return escapeHtml(label.trim());
    const external = isExternalUrl(resolved);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    const className = resolved.includes('category.html') || resolved.includes('viewer.html') || resolved.includes('secret.html') ? 'doc-link' : '';
    return `<a class="${className}" href="${escapeAttr(resolved)}"${attrs}>${escapeHtml(label.trim())}</a>`;
  });

  working = working.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  working = working.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  working = working.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  working = working.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  working = working.replace(/%%ANCHOR(\d+)%%/g, (_, index) => placeholders[Number(index)] || '');
  working = working.replace(/%%CODE(\d+)%%/g, (_, index) => placeholders[Number(index)] || '');
  working = working.replace(/%%MATH(\d+)%%/g, (_, index) => placeholders[Number(index)] || '');
  return working;
}

function protectMathSegments(text, placeholders) {
  let working = String(text);

  working = working.replace(/\$\$[\s\S]+?\$\$/g, (math) => {
    const token = `%%MATH${placeholders.length}%%`;
    placeholders.push(`<span class="math-source">${escapeHtml(math)}</span>`);
    return token;
  });

  working = working.replace(/\$([^$\n]+?)\$/g, (math) => {
    const token = `%%MATH${placeholders.length}%%`;
    placeholders.push(`<span class="math-source">${escapeHtml(math)}</span>`);
    return token;
  });

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
    if (doc.collection === 'annual') continue;
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
    if (node.parentElement?.closest('.math-source, .math-display, mjx-container')) {
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
        const index = findPatternIndex(original, entry, cursor);
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

function findPatternIndex(text, entry, start) {
  let index = text.indexOf(entry.pattern, start);
  while (index !== -1) {
    if (isAllowedAutoLinkMatch(text, index, entry.pattern)) {
      return index;
    }
    index = text.indexOf(entry.pattern, index + 1);
  }
  return -1;
}

function isAllowedAutoLinkMatch(text, index, pattern) {
  if (isInsideUrlLikeText(text, index, pattern.length)) {
    return false;
  }

  const before = index > 0 ? text[index - 1] : '';
  const afterIndex = index + pattern.length;
  const after = afterIndex < text.length ? text[afterIndex] : '';
  const startsWord = isWordLike(pattern[0]);
  const endsWord = isWordLike(pattern[pattern.length - 1]);

  if (startsWord && before && isWordLike(before)) {
    return false;
  }
  if (endsWord && after && isWordLike(after)) {
    return false;
  }
  return true;
}

function isInsideUrlLikeText(text, index, length) {
  const left = text.slice(Math.max(0, index - 160), index);
  const right = text.slice(index, Math.min(text.length, index + length + 160));
  const lastWhitespace = Math.max(left.lastIndexOf(' '), left.lastIndexOf('\n'), left.lastIndexOf('\t'));
  const tokenLeft = left.slice(lastWhitespace + 1);
  const nextWhitespaceMatches = right.match(/[\s<>"'，。；、！？]/);
  const tokenRight = nextWhitespaceMatches ? right.slice(0, nextWhitespaceMatches.index) : right;
  const token = `${tokenLeft}${tokenRight}`;
  return /^(?:https?:\/\/|www\.)/i.test(token) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(token);
}

function isWordLike(char) {
  return /[\p{L}\p{N}_-]/u.test(char);
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
  typesetMath(host);
}

function typesetMath(host, attempt = 0) {
  if (!host) {
    return;
  }
  pendingMathHosts.add(host);
  if (flushPendingMathTypesetting()) {
    return;
  }
  if (attempt < 80) {
    window.setTimeout(() => typesetMath(host, attempt + 1), 150);
  }
}

function flushPendingMathTypesetting() {
  const mathJax = window.MathJax;
  if (mathJax?.startup?.promise && mathJax.typesetPromise) {
    const hosts = Array.from(pendingMathHosts).filter((item) => item.isConnected);
    pendingMathHosts.clear();
    if (!hosts.length) {
      return true;
    }
    mathJax.startup.promise.then(() => {
      mathJax.typesetClear?.(hosts);
      return mathJax.typesetPromise(hosts);
    }).catch(() => {});
    return true;
  }
  if (mathJax?.typesetPromise) {
    const hosts = Array.from(pendingMathHosts).filter((item) => item.isConnected);
    pendingMathHosts.clear();
    if (!hosts.length) {
      return true;
    }
    mathJax.typesetClear?.(hosts);
    mathJax.typesetPromise(hosts).catch(() => {});
    return true;
  }
  return false;
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

function resolveMarkdownAssetSrc(src, basePath = '') {
  const trimmed = String(src || '').trim();
  if (
    !trimmed ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#') ||
    isExternalUrl(trimmed) ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const cleanBase = String(basePath || '').split(/[?#]/)[0];
  const baseDir = cleanBase.includes('/') ? cleanBase.slice(0, cleanBase.lastIndexOf('/') + 1) : '/';
  try {
    const resolved = new URL(trimmed, `${window.location.origin}${baseDir}`);
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch (_error) {
    return trimmed;
  }
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
  if (categoryId === 'annual') return '/category.html?cat=minors&collection=annual';
  return `/category.html?cat=${encodeURIComponent(categoryId)}`;
}

function viewerHref(docPath) {
  const publicId = DOC_DEFINITIONS.find((doc) => doc.path === docPath)?.publicId;
  return `/viewer.html?doc=${encodeURIComponent(publicId || docPath)}`;
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

function formatShanghaiTimestamp(value) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: SITE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date).replace(/\//g, '-');
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
