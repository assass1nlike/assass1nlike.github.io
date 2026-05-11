const SECRET_ROOM_STORAGE_KEY = 'assassinlike.secret.room.messages.v1';
const SECRET_SESSION_KEY = 'assassinlike.secret.room.identity.v1';
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

document.addEventListener('DOMContentLoaded', () => {
  initSecretRoom();
});

async function initSecretRoom() {
  const host = document.getElementById('secret-app');
  if (!host) {
    return;
  }

  const storedIdentityId = readSessionIdentity();
  if (storedIdentityId) {
    const identity = getIdentityById(storedIdentityId);
    if (identity) {
      await renderSecretSpace(host, identity);
      return;
    }
  }

  renderLogin(host);
}

function renderLogin(host, errorMessage = '') {
  host.innerHTML = `
    <section class="secret-gate">
      <div class="secret-gate-copy">
        <div class="secret-kicker">private entry</div>
        <h1 class="secret-title">输入密码进入秘密空间</h1>
        <p class="secret-summary">
          这里是一个仅对已知身份开放的消息区。输入正确密码后，系统会识别你的身份并打开聊天界面。
        </p>
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
        <div class="secret-login-hint">仅支持两个身份：assassinlike 与 vitality x。</div>
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
    await renderSecretSpace(host, identity);
  });
}

async function renderSecretSpace(host, identity) {
  const messages = readMessages();
  host.innerHTML = `
    <section class="secret-room">
      <div class="secret-room-head">
        <div class="secret-room-copy">
          <div class="secret-kicker">secret space</div>
          <h1 class="secret-title">秘密空间</h1>
          <p class="secret-summary">
            当前身份：<strong>${escapeHtml(identity.label)}</strong>。
            这里的消息会保留在本地历史中，并带上发送时间。
          </p>
        </div>
        <div class="secret-room-actions">
          <button id="secret-history-toggle" class="icon-link secret-action" type="button">历史</button>
          <button id="secret-lock-button" class="icon-link secret-action" type="button">锁定</button>
        </div>
      </div>

      <div class="secret-room-grid">
        <section class="secret-chat-panel">
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
              <div class="secret-compose-tip">Ctrl + Enter 发送</div>
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

  function refreshViews() {
    const allMessages = readMessages();
    renderThread(thread, allMessages);
    renderHistory(historyList, allMessages);
    scrollThreadToBottom(thread);
  }

  refreshViews();

  if (input) {
    input.focus();
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        form?.requestSubmit();
      }
    });
  }

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = String(input?.value || '').trim();
      if (!text) {
        return;
      }
      const message = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        authorId: identity.id,
        authorLabel: identity.label,
        body: text,
        createdAt: new Date().toISOString(),
      };
      const nextMessages = [...readMessages(), message];
      writeMessages(nextMessages);
      if (input) {
        input.value = '';
      }
      refreshViews();
      scrollThreadToBottom(thread);
    });
  }

  if (historyToggle && historyPanel) {
    historyToggle.addEventListener('click', () => {
      const shouldShow = historyPanel.hidden;
      historyPanel.hidden = !shouldShow;
      historyToggle.textContent = shouldShow ? '关闭历史' : '历史';
      if (shouldShow) {
        renderHistory(historyList, readMessages());
      }
    });
  }

  if (lockButton) {
    lockButton.addEventListener('click', () => {
      clearSessionIdentity();
      renderLogin(host);
    });
  }
}

function renderThread(host, messages) {
  if (!host) {
    return;
  }
  if (!messages.length) {
    host.innerHTML = '<div class="secret-empty">暂无消息。先写第一条。</div>';
    return;
  }

  const items = messages.map((message) => {
    const mine = message.authorId ? ` is-${message.authorId}` : '';
    return `
      <article class="secret-message${mine}">
        <div class="secret-message-head">
          <span class="secret-message-author">${escapeHtml(message.authorLabel || 'unknown')}</span>
          <span class="secret-message-time">${escapeHtml(formatSecretTimestamp(message.createdAt))}</span>
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
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map((message) => `
      <div class="secret-history-item">
        <div class="secret-history-line">
          <span class="secret-history-author">${escapeHtml(message.authorLabel || 'unknown')}</span>
          <span class="secret-history-time">${escapeHtml(formatSecretTimestamp(message.createdAt))}</span>
        </div>
        <div class="secret-history-body">${escapeHtml(message.body)}</div>
      </div>
    `);

  host.innerHTML = items.join('');
}

async function resolveIdentity(password) {
  const digest = await sha256Hex(password);
  return SECRET_IDENTITY_DEFINITIONS.find((item) => item.passwordHash === digest) || null;
}

function readMessages() {
  try {
    const raw = localStorage.getItem(SECRET_ROOM_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (_error) {
    return [];
  }
}

function writeMessages(messages) {
  try {
    localStorage.setItem(SECRET_ROOM_STORAGE_KEY, JSON.stringify(messages));
  } catch (_error) {
    // Ignore persistence failures in restricted browsers.
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
