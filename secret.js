const SECRET_ROOM_NAME = 'main';
const SECRET_ROOM_CACHE_KEY = 'assassinlike.secret.room.messages.v2';
const SECRET_ROOM_LEGACY_CACHE_KEY = 'assassinlike.secret.room.messages.v1';
const SECRET_SESSION_KEY = 'assassinlike.secret.room.identity.v1';
const SECRET_DRAFT_KEY = 'assassinlike.secret.room.draft.v1';
const SECRET_REMOTE_POLL_MS = 5000;

const SECRET_IDENTITY_DEFINITIONS = [
  {
    id: 'assassinlike',
    label: 'assassinlike',
    passwordHash: '80264b1cd82539fe49d2b09eeba91da04285159af5c77e79341540b4b8ef1fbc',
    badge: 'A',
  },
  {
    id: 'vitality-x',
    label: 'vitality x',
    passwordHash: 'eb3a8bbecb2c9d7ad869180a9cdbcd9feaaaa7dfcdd910cd9fef8d89e8fb563c',
    badge: 'V',
  },
];

const SECRET_REMOTE_CONFIG = normalizeRemoteConfig(window.SECRET_SPACE_CONFIG);

const secretState = {
  identity: null,
  messages: [],
  remoteStatus: '',
  remoteError: '',
  remoteSeeded: false,
  pollTimer: null,
  lastRenderedSignature: '',
};

document.addEventListener('DOMContentLoaded', () => {
  initSecretRoom();
});

window.addEventListener('beforeunload', () => {
  stopRemotePolling();
});

async function initSecretRoom() {
  const host = document.getElementById('secret-app');
  if (!host) {
    return;
  }

  const identityId = readSessionIdentity();
  if (identityId) {
    const identity = getIdentityById(identityId);
    if (identity) {
      await openSecretSpace(host, identity);
      return;
    }
  }

  renderLogin(host);
}

function renderLogin(host, errorMessage = '') {
  const remoteBadge = SECRET_REMOTE_CONFIG.enabled
    ? `<span class="secret-status-badge is-online">远程已配置</span>`
    : `<span class="secret-status-badge is-offline">当前为本地模式</span>`;

  host.innerHTML = `
    <section class="secret-gate">
      <div class="secret-gate-copy">
        <div class="secret-kicker">private entry</div>
        <h1 class="secret-title">输入密码进入秘密空间</h1>
        <p class="secret-summary">
          这里是一个仅对已知身份开放的消息区。输入正确密码后，系统会识别你的身份并打开聊天界面。
        </p>
        <div class="secret-badges">${remoteBadge}</div>
      </div>

      <form id="secret-login-form" class="secret-login-form">
        <label class="secret-field">
          <span class="secret-field-label">密码</span>
          <input
            id="secret-password-input"
            class="secret-input"
            type="password"
            autocomplete="current-password"
            inputmode="numeric"
            placeholder="请输入密码"
            required
          >
        </label>
        <button class="secret-submit" type="submit">进入</button>
        <div class="secret-login-hint">
          仅支持两个身份：assassinlike 与 vitality x。要实现跨设备同步，请在 <code>secret-config.js</code> 中配置远程后端。
        </div>
        ${errorMessage ? `<div class="secret-error" role="alert">${escapeHtml(errorMessage)}</div>` : ''}
      </form>
    </section>
  `;

  const form = document.getElementById('secret-login-form');
  const input = document.getElementById('secret-password-input');
  if (input) {
    input.focus();
  }

  if (!form) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = String(input?.value || '').trim();
    const identity = await resolveIdentity(password);
    if (!identity) {
      renderLogin(host, '密码不正确。');
      return;
    }

    writeSessionIdentity(identity.id);
    await openSecretSpace(host, identity);
  });
}

async function openSecretSpace(host, identity) {
  secretState.identity = identity;
  stopRemotePolling();

  host.innerHTML = `
    <section class="secret-room">
      <div class="secret-room-head">
        <div class="secret-room-copy">
          <div class="secret-kicker">secret space</div>
          <h1 class="secret-title">秘密空间</h1>
          <p class="secret-summary">
            当前身份：<strong>${escapeHtml(identity.label)}</strong>。
            这里的消息会在远程空间中同步，并保留完整历史。
          </p>
          <div id="secret-remote-status" class="secret-remote-status"></div>
        </div>
        <div class="secret-room-actions">
          <button id="secret-sync-button" class="icon-link secret-action" type="button">同步</button>
          <button id="secret-history-toggle" class="icon-link secret-action" type="button">历史</button>
          <button id="secret-lock-button" class="icon-link secret-action" type="button">锁定</button>
        </div>
      </div>

      <div class="secret-room-grid">
        <section class="secret-chat-panel">
          <div class="secret-thread-head">
            <div class="secret-thread-title">消息区</div>
            <div class="secret-thread-subtitle">Ctrl + Enter 发送</div>
          </div>
          <div id="secret-thread" class="secret-thread" aria-live="polite"></div>

          <form id="secret-compose-form" class="secret-compose">
            <label class="secret-compose-label" for="secret-message-input">编辑消息</label>
            <textarea
              id="secret-message-input"
              class="secret-textarea"
              rows="4"
              placeholder="在这里输入内容，确认后发送。"
              maxlength="4000"
              required
            ></textarea>
            <div class="secret-compose-meta">
              <div class="secret-compose-tip">消息会写入远程历史；如果远程暂时不可用，会回退到本地缓存。</div>
              <button class="secret-submit" type="submit">发送</button>
            </div>
          </form>
        </section>

        <aside id="secret-history-panel" class="secret-history-panel" hidden>
          <div class="secret-history-head">
            <div class="secret-history-title">历史信息</div>
            <div class="secret-history-subtitle">按时间倒序浏览全部记录</div>
          </div>
          <div id="secret-history-list" class="secret-history-list"></div>
        </aside>
      </div>
    </section>
  `;

  const thread = document.getElementById('secret-thread');
  const form = document.getElementById('secret-compose-form');
  const input = document.getElementById('secret-message-input');
  const historyToggle = document.getElementById('secret-history-toggle');
  const historyPanel = document.getElementById('secret-history-panel');
  const historyList = document.getElementById('secret-history-list');
  const lockButton = document.getElementById('secret-lock-button');
  const syncButton = document.getElementById('secret-sync-button');
  const statusHost = document.getElementById('secret-remote-status');

  const draft = readDraft(identity.id);
  if (input && draft) {
    input.value = draft;
  }

  if (input) {
    input.focus();
    input.addEventListener('input', () => {
      writeDraft(identity.id, input.value);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        form?.requestSubmit();
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const text = String(input?.value || '').trim();
      if (!text) {
        return;
      }

      const message = {
        id: generateMessageId(identity.id),
        room: SECRET_ROOM_NAME,
        author_id: identity.id,
        author_label: identity.label,
        body: text,
        created_at: new Date().toISOString(),
      };

      if (input) {
        input.value = '';
      }
      writeDraft(identity.id, '');

      try {
        if (SECRET_REMOTE_CONFIG.enabled) {
          await upsertRemoteMessages([message]);
          await syncSecretMessages({ forceRemote: true });
        } else {
          const nextMessages = [...secretState.messages, message];
          secretState.messages = sortMessages(nextMessages);
          persistLocalCache(secretState.messages);
          renderSecretMessages(thread, historyList, identity, secretState.messages);
          updateSecretStatus(statusHost);
        }
      } catch (error) {
        secretState.remoteError = error.message;
        const nextMessages = [...secretState.messages, message];
        secretState.messages = sortMessages(nextMessages);
        persistLocalCache(secretState.messages);
        renderSecretMessages(thread, historyList, identity, secretState.messages);
        updateSecretStatus(statusHost);
      }
    });
  }

  if (historyToggle && historyPanel) {
    historyToggle.addEventListener('click', () => {
      const shouldShow = historyPanel.hidden;
      historyPanel.hidden = !shouldShow;
      historyToggle.textContent = shouldShow ? '关闭历史' : '历史';
      if (shouldShow) {
        renderHistory(historyList, secretState.messages);
      }
    });
  }

  if (syncButton) {
    syncButton.addEventListener('click', async () => {
      await syncSecretMessages({ forceRemote: true, announce: true });
    });
  }

  if (lockButton) {
    lockButton.addEventListener('click', () => {
      stopRemotePolling();
      clearSessionIdentity();
      secretState.identity = null;
      secretState.messages = [];
      renderLogin(host);
    });
  }

  await syncSecretMessages({ forceRemote: true, announce: true, statusHost, thread, historyList, identity });
  startRemotePolling({ statusHost, thread, historyList, identity });
}

async function syncSecretMessages(options = {}) {
  const {
    forceRemote = false,
    announce = false,
    statusHost,
    thread,
    historyList,
    identity = secretState.identity,
  } = options;

  if (!identity) {
    return [];
  }

  const remoteEnabled = SECRET_REMOTE_CONFIG.enabled;
  if (!remoteEnabled && !forceRemote) {
    const localMessages = sortMessages(readLocalMessages());
    secretState.messages = localMessages;
    secretState.remoteStatus = '本地模式';
    secretState.remoteError = '';
    persistLocalCache(localMessages);
    renderSecretMessages(thread, historyList, identity, localMessages);
    updateSecretStatus(statusHost);
    return localMessages;
  }

  if (!remoteEnabled) {
    const localMessages = sortMessages(readLocalMessages());
    secretState.messages = localMessages;
    secretState.remoteStatus = '当前未配置远程后端，仍在使用本地缓存';
    secretState.remoteError = '';
    persistLocalCache(localMessages);
    renderSecretMessages(thread, historyList, identity, localMessages);
    updateSecretStatus(statusHost);
    return localMessages;
  }

  secretState.remoteStatus = announce ? '正在同步远程消息…' : secretState.remoteStatus;
  updateSecretStatus(statusHost);

  try {
    let remoteMessages = await fetchRemoteMessages();
    if (!remoteMessages.length) {
      const localMessages = sortMessages(readLocalMessages());
      if (localMessages.length && !secretState.remoteSeeded) {
        await upsertRemoteMessages(localMessages);
        secretState.remoteSeeded = true;
        remoteMessages = await fetchRemoteMessages();
      }
    }

    const nextMessages = sortMessages(remoteMessages);
    secretState.messages = nextMessages;
    secretState.remoteStatus = `远程同步完成 · ${nextMessages.length} 条`;
    secretState.remoteError = '';
    persistLocalCache(nextMessages);
    renderSecretMessages(thread, historyList, identity, nextMessages);
    updateSecretStatus(statusHost);
    return nextMessages;
  } catch (error) {
    const cachedMessages = sortMessages(readLocalMessages());
    secretState.messages = cachedMessages;
    secretState.remoteStatus = '远程同步失败，已回退到本地缓存';
    secretState.remoteError = error.message;
    renderSecretMessages(thread, historyList, identity, cachedMessages);
    updateSecretStatus(statusHost);
    return cachedMessages;
  }
}

function renderSecretMessages(threadHost, historyHost, identity, messages) {
  renderThread(threadHost, identity, messages);
  renderHistory(historyHost, messages);
  scrollThreadToBottom(threadHost);
  secretState.lastRenderedSignature = buildMessagesSignature(messages);
}

function renderThread(host, identity, messages) {
  if (!host) {
    return;
  }

  if (!messages.length) {
    host.innerHTML = '<div class="secret-empty">还没有消息。先写第一条。</div>';
    return;
  }

  const items = messages.map((message) => {
    const mine = message.author_id === identity.id ? ` is-${identity.id} is-own` : '';
    return `
      <article class="secret-message${mine}">
        <div class="secret-message-head">
          <span class="secret-message-author">${escapeHtml(message.author_label || 'unknown')}</span>
          <span class="secret-message-time">${escapeHtml(formatSecretTimestamp(message.created_at))}</span>
        </div>
        <div class="secret-message-body">${escapeHtml(message.body)}</div>
      </article>
    `;
  });

  host.innerHTML = items.join('');
}

function renderHistory(host, messages) {
  if (!host) {
    return;
  }

  if (!messages.length) {
    host.innerHTML = '<div class="secret-empty">没有历史记录。</div>';
    return;
  }

  const items = [...messages]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map((message) => `
      <div class="secret-history-item">
        <div class="secret-history-line">
          <span class="secret-history-author">${escapeHtml(message.author_label || 'unknown')}</span>
          <span class="secret-history-time">${escapeHtml(formatSecretTimestamp(message.created_at))}</span>
        </div>
        <div class="secret-history-body">${escapeHtml(message.body)}</div>
      </div>
    `);

  host.innerHTML = items.join('');
}

async function fetchRemoteMessages() {
  const endpoint = buildRemoteEndpoint();
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: buildRemoteHeaders(),
  });

  if (!response.ok) {
    throw new Error(`远程读取失败 (${response.status})`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data.map(normalizeMessage).filter(Boolean) : [];
}

async function upsertRemoteMessages(messages) {
  if (!messages.length) {
    return [];
  }

  const endpoint = `${buildRemoteEndpoint()}&on_conflict=id`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...buildRemoteHeaders(),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(messages.map((message) => ({
      id: message.id,
      room: message.room || SECRET_ROOM_NAME,
      author_id: message.author_id,
      author_label: message.author_label,
      body: message.body,
      created_at: message.created_at,
    }))),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`远程写入失败 (${response.status}) ${text}`.trim());
  }

  const data = await response.json().catch(() => []);
  return Array.isArray(data) ? data.map(normalizeMessage).filter(Boolean) : [];
}

function updateSecretStatus(statusHost) {
  const statusText = SECRET_REMOTE_CONFIG.enabled
    ? secretState.remoteStatus || '远程待同步'
    : '当前为本地模式';
  const errorText = secretState.remoteError ? ` · ${secretState.remoteError}` : '';

  if (statusHost) {
    statusHost.innerHTML = `
      <span class="secret-status-badge ${SECRET_REMOTE_CONFIG.enabled ? 'is-online' : 'is-offline'}">
        ${escapeHtml(statusText)}
      </span>
      ${errorText ? `<span class="secret-status-error">${escapeHtml(errorText)}</span>` : ''}
    `;
  }
}

function startRemotePolling(context = {}) {
  stopRemotePolling();
  if (!SECRET_REMOTE_CONFIG.enabled) {
    return;
  }

  secretState.pollTimer = window.setInterval(() => {
    syncSecretMessages({
      forceRemote: true,
      announce: false,
      statusHost: context.statusHost,
      thread: context.thread,
      historyList: context.historyList,
      identity: context.identity,
    }).catch(() => {});
  }, SECRET_REMOTE_CONFIG.pollIntervalMs || SECRET_REMOTE_POLL_MS);
}

function stopRemotePolling() {
  if (secretState.pollTimer) {
    window.clearInterval(secretState.pollTimer);
    secretState.pollTimer = null;
  }
}

function buildRemoteEndpoint() {
  const base = SECRET_REMOTE_CONFIG.supabaseUrl.replace(/\/+$/, '');
  const room = encodeURIComponent(SECRET_REMOTE_CONFIG.room || SECRET_ROOM_NAME);
  return `${base}/rest/v1/secret_messages?select=id,room,author_id,author_label,body,created_at&room=eq.${room}&order=created_at.asc`;
}

function buildRemoteHeaders() {
  return {
    apikey: SECRET_REMOTE_CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${SECRET_REMOTE_CONFIG.supabaseAnonKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Cache-Control': 'no-cache',
  };
}

function normalizeRemoteConfig(config) {
  const raw = config && typeof config === 'object' ? config : {};
  const supabaseUrl = String(raw.supabaseUrl || '').trim().replace(/\/+$/, '');
  const supabaseAnonKey = String(raw.supabaseAnonKey || '').trim();
  const room = String(raw.room || SECRET_ROOM_NAME).trim() || SECRET_ROOM_NAME;
  const pollIntervalMs = Number(raw.pollIntervalMs || SECRET_REMOTE_POLL_MS);

  return {
    provider: 'supabase',
    supabaseUrl,
    supabaseAnonKey,
    room,
    pollIntervalMs: Number.isFinite(pollIntervalMs) && pollIntervalMs > 1000 ? pollIntervalMs : SECRET_REMOTE_POLL_MS,
    enabled: Boolean(supabaseUrl && supabaseAnonKey),
  };
}

function normalizeMessage(message) {
  if (!message || typeof message !== 'object') {
    return null;
  }

  return {
    id: String(message.id || ''),
    room: String(message.room || SECRET_ROOM_NAME),
    author_id: String(message.author_id || ''),
    author_label: String(message.author_label || ''),
    body: String(message.body || ''),
    created_at: String(message.created_at || new Date().toISOString()),
  };
}

function sortMessages(messages) {
  return [...messages]
    .map(normalizeMessage)
    .filter(Boolean)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

function buildMessagesSignature(messages) {
  return messages.map((message) => `${message.id}|${message.created_at}|${message.body}`).join('\n');
}

function generateMessageId(authorId) {
  const suffix = Math.random().toString(16).slice(2, 10);
  return `${authorId}-${Date.now()}-${suffix}`;
}

function persistLocalCache(messages) {
  const serialized = JSON.stringify(messages);
  try {
    localStorage.setItem(SECRET_ROOM_CACHE_KEY, serialized);
    localStorage.setItem(SECRET_ROOM_LEGACY_CACHE_KEY, serialized);
  } catch (_error) {
    // Ignore persistence failures.
  }
}

function readLocalMessages() {
  try {
    const primary = localStorage.getItem(SECRET_ROOM_CACHE_KEY);
    if (primary) {
      return sortMessages(JSON.parse(primary));
    }
    const legacy = localStorage.getItem(SECRET_ROOM_LEGACY_CACHE_KEY);
    if (legacy) {
      return sortMessages(JSON.parse(legacy));
    }
  } catch (_error) {
    return [];
  }
  return [];
}

function readDraft(identityId) {
  try {
    return localStorage.getItem(`${SECRET_DRAFT_KEY}.${identityId}`) || '';
  } catch (_error) {
    return '';
  }
}

function writeDraft(identityId, value) {
  try {
    localStorage.setItem(`${SECRET_DRAFT_KEY}.${identityId}`, String(value || ''));
  } catch (_error) {
    // Ignore draft failures.
  }
}

function readSessionIdentity() {
  try {
    return sessionStorage.getItem(SECRET_SESSION_KEY) || '';
  } catch (_error) {
    return '';
  }
}

function writeSessionIdentity(identityId) {
  try {
    sessionStorage.setItem(SECRET_SESSION_KEY, identityId);
  } catch (_error) {
    // Ignore session failures.
  }
}

function clearSessionIdentity() {
  try {
    sessionStorage.removeItem(SECRET_SESSION_KEY);
  } catch (_error) {
    // Ignore session failures.
  }
}

function getIdentityById(identityId) {
  return SECRET_IDENTITY_DEFINITIONS.find((item) => item.id === identityId) || null;
}

async function resolveIdentity(password) {
  const digest = await sha256Hex(password);
  return SECRET_IDENTITY_DEFINITIONS.find((item) => item.passwordHash === digest) || null;
}

function scrollThreadToBottom(host) {
  if (!host) {
    return;
  }
  host.scrollTop = host.scrollHeight;
}

function formatSecretTimestamp(value) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date).replace(/\//g, '-');
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(String(value || ''));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
