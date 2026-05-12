const SECRET_ROOM_NAME = 'main';
const SECRET_ROOM_CACHE_KEY = 'assassinlike.secret.room.records.v3';
const SECRET_ROOM_LEGACY_CACHE_KEYS = [
  'assassinlike.secret.room.messages.v2',
  'assassinlike.secret.room.messages.v1',
];
const SECRET_DRAFT_KEY = 'assassinlike.secret.room.draft.v1';
const SECRET_REMOTE_POLL_MS = 5000;
const SECRET_MESSAGE_BODY_VERSION = 2;

const SECRET_IDENTITY_DEFINITIONS = [
  {
    id: 'assassinlike',
    label: 'assassinlike',
    passwordHash: '80264b1cd82539fe49d2b09eeba91da04285159af5c77e79341540b4b8ef1fbc',
    badge: 'A',
    keyEnvelope: {
      iterations: 210000,
      salt: '22fTP+PsJun/zZB14U4nXA==',
      iv: '56ywfqgAK/gsS5qe',
      wrappedKey: 'NmvqmiIPAob1uVS86E76jLjhrjvBHptk7bm4bfpuqld77QH0YBRoK7+d1Q+PfOaa',
    },
  },
  {
    id: 'vitality-x',
    label: 'vitality x',
    passwordHash: 'eb3a8bbecb2c9d7ad869180a9cdbcd9feaaaa7dfcdd910cd9fef8d89e8fb563c',
    badge: 'V',
    keyEnvelope: {
      iterations: 210000,
      salt: 'FcnXn5Hmf8uJXvfWkVzIzQ==',
      iv: 'SJOYyqOgjLt+m7/M',
      wrappedKey: 'FT+Rf5VxkH+V21gpNUE5oe5j9izw5VyyTh0sQofpiyEnDADuMDJVNI5ilyg5F5vF',
    },
  },
];

const SECRET_REMOTE_CONFIG = normalizeRemoteConfig(window.SECRET_SPACE_CONFIG);

const secretState = {
  identity: null,
  crypto: null,
  messages: [],
  encryptedRecords: [],
  remoteStatus: '',
  remoteError: '',
  rejectedRemoteRows: 0,
  pollTimer: null,
  lastRenderedSignature: '',
};

document.addEventListener('DOMContentLoaded', () => {
  initSecretRoom();
});

window.addEventListener('beforeunload', () => {
  stopRemotePolling();
});

function initSecretRoom() {
  const host = document.getElementById('secret-app');
  if (!host) {
    return;
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
          密码只在当前浏览器内用于解开房间密钥。远程空间只保存加密后的消息正文。
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
          仅支持两个身份：assassinlike 与 vitality x。锁定或刷新页面后需要重新输入密码。
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
    const session = await authenticateSecret(password);
    if (!session) {
      renderLogin(host, '密码不正确，或当前浏览器不支持 Web Crypto。');
      return;
    }

    clearLegacyLocalCaches();
    await openSecretSpace(host, session);
  });
}

async function openSecretSpace(host, session) {
  const { identity } = session;
  secretState.identity = identity;
  secretState.crypto = session.crypto;
  stopRemotePolling();

  host.innerHTML = `
    <section class="secret-room">
      <div class="secret-room-head">
        <div class="secret-room-copy">
          <div class="secret-kicker">secret space</div>
          <h1 class="secret-title">秘密空间</h1>
          <p class="secret-summary">
            当前身份：<strong>${escapeHtml(identity.label)}</strong>。
            消息会先在本机加密，再写入远程空间。
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
              <div class="secret-compose-tip">消息正文不会以明文写入远程或本地缓存。</div>
              <button class="secret-submit" type="submit">发送</button>
            </div>
          </form>
        </section>

        <aside id="secret-history-panel" class="secret-history-panel" hidden>
          <div class="secret-history-head">
            <div class="secret-history-title">历史信息</div>
            <div class="secret-history-subtitle">按时间倒序浏览已解密记录</div>
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
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const text = String(input?.value || '').trim();
      if (!text) {
        return;
      }

      const record = await createEncryptedRecord(identity, text);

      if (input) {
        input.value = '';
      }

      try {
        if (SECRET_REMOTE_CONFIG.enabled) {
          await insertRemoteRecords([record]);
          await syncSecretMessages({ forceRemote: true, statusHost, thread, historyList, identity });
        } else {
          const records = dedupeRecords([...secretState.encryptedRecords, record]);
          await acceptRecords(records, { statusHost, thread, historyList, identity });
          secretState.remoteStatus = '本地模式';
          updateSecretStatus(statusHost);
        }
      } catch (error) {
        secretState.remoteError = error.message;
        const records = dedupeRecords([...secretState.encryptedRecords, record]);
        await acceptRecords(records, { statusHost, thread, historyList, identity });
        secretState.remoteStatus = '远程写入失败，已保存在本地加密缓存';
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
      await syncSecretMessages({ forceRemote: true, announce: true, statusHost, thread, historyList, identity });
    });
  }

  if (lockButton) {
    lockButton.addEventListener('click', () => {
      stopRemotePolling();
      secretState.identity = null;
      secretState.crypto = null;
      secretState.messages = [];
      secretState.encryptedRecords = [];
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

  if (!identity || !secretState.crypto) {
    return [];
  }

  if (!SECRET_REMOTE_CONFIG.enabled && !forceRemote) {
    const records = readLocalRecords();
    secretState.remoteStatus = '本地模式';
    secretState.remoteError = '';
    return acceptRecords(records, { statusHost, thread, historyList, identity });
  }

  if (!SECRET_REMOTE_CONFIG.enabled) {
    const records = readLocalRecords();
    secretState.remoteStatus = '当前未配置远程后端，仍在使用本地加密缓存';
    secretState.remoteError = '';
    return acceptRecords(records, { statusHost, thread, historyList, identity });
  }

  secretState.remoteStatus = announce ? '正在同步远程消息…' : secretState.remoteStatus;
  updateSecretStatus(statusHost);

  try {
    const remoteRecords = await fetchRemoteRecords();
    const localRecords = readLocalRecords();
    const mergedRecords = dedupeRecords([...localRecords, ...remoteRecords]);
    const unsyncedRecords = localRecords.filter((record) => !remoteRecords.some((remote) => remote.id === record.id));
    if (unsyncedRecords.length) {
      await insertRemoteRecords(unsyncedRecords).catch(() => {});
    }

    const messages = await acceptRecords(mergedRecords, { statusHost, thread, historyList, identity });
    secretState.remoteStatus = `远程同步完成 · ${messages.length} 条`;
    secretState.remoteError = '';
    updateSecretStatus(statusHost);
    return messages;
  } catch (error) {
    const records = readLocalRecords();
    const messages = await acceptRecords(records, { statusHost, thread, historyList, identity });
    secretState.remoteStatus = '远程同步失败，已回退到本地加密缓存';
    secretState.remoteError = error.message;
    updateSecretStatus(statusHost);
    return messages;
  }
}

async function acceptRecords(records, context = {}) {
  const encryptedRecords = dedupeRecords(records).filter((record) => isEncryptedRecord(record));
  const { messages, rejected } = await decryptRecords(encryptedRecords);
  secretState.encryptedRecords = encryptedRecords;
  secretState.messages = sortMessages(messages);
  secretState.rejectedRemoteRows = rejected + records.length - encryptedRecords.length;
  persistLocalRecords(encryptedRecords);
  renderSecretMessages(context.thread, context.historyList, context.identity || secretState.identity, secretState.messages);
  updateSecretStatus(context.statusHost);
  return secretState.messages;
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
    host.innerHTML = '<div class="secret-empty">还没有可解密的消息。先写第一条。</div>';
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
    host.innerHTML = '<div class="secret-empty">没有可解密的历史记录。</div>';
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

async function fetchRemoteRecords() {
  const response = await fetch(buildRemoteSelectEndpoint(), {
    method: 'GET',
    headers: buildRemoteHeaders(),
  });

  if (!response.ok) {
    throw new Error(`远程读取失败 (${response.status})`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data.map(normalizeRecord).filter(Boolean) : [];
}

async function insertRemoteRecords(records) {
  const safeRecords = dedupeRecords(records).filter((record) => isEncryptedRecord(record));
  if (!safeRecords.length) {
    return [];
  }

  const response = await fetch(buildRemoteTableEndpoint(), {
    method: 'POST',
    headers: {
      ...buildRemoteHeaders(),
      Prefer: 'return=representation',
    },
    body: JSON.stringify(safeRecords.map((record) => ({
      id: record.id,
      room: record.room || SECRET_ROOM_NAME,
      author_id: record.author_id,
      author_label: record.author_label,
      body: record.body,
      created_at: record.created_at,
    }))),
  });

  if (!response.ok && response.status !== 409) {
    const text = await response.text().catch(() => '');
    throw new Error(`远程写入失败 (${response.status}) ${text}`.trim());
  }

  const data = await response.json().catch(() => []);
  return Array.isArray(data) ? data.map(normalizeRecord).filter(Boolean) : [];
}

function updateSecretStatus(statusHost) {
  const statusText = SECRET_REMOTE_CONFIG.enabled
    ? secretState.remoteStatus || '远程待同步'
    : '当前为本地模式';
  const rejectedText = secretState.rejectedRemoteRows
    ? ` · 已忽略 ${secretState.rejectedRemoteRows} 条无效或旧版明文记录`
    : '';
  const errorText = secretState.remoteError ? ` · ${secretState.remoteError}` : '';

  if (statusHost) {
    statusHost.innerHTML = `
      <span class="secret-status-badge ${SECRET_REMOTE_CONFIG.enabled ? 'is-online' : 'is-offline'}">
        ${escapeHtml(statusText)}
      </span>
      ${rejectedText ? `<span class="secret-status-error">${escapeHtml(rejectedText)}</span>` : ''}
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

async function authenticateSecret(password) {
  if (!window.crypto?.subtle) {
    return null;
  }

  const digest = await sha256Hex(password);
  const identity = SECRET_IDENTITY_DEFINITIONS.find((item) => item.passwordHash === digest);
  if (!identity) {
    return null;
  }

  try {
    const roomKey = await unwrapRoomKey(password, identity);
    const aesKey = await crypto.subtle.importKey('raw', roomKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    return {
      identity,
      crypto: {
        aesKey,
      },
    };
  } catch (_error) {
    return null;
  }
}

async function unwrapRoomKey(password, identity) {
  const envelope = identity.keyEnvelope;
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encodeText(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const wrappingKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: base64ToBytes(envelope.salt),
      iterations: envelope.iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );

  const rawKey = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToBytes(envelope.iv),
      additionalData: encodeText(buildRoomKeyAad(identity.id)),
    },
    wrappingKey,
    base64ToBytes(envelope.wrappedKey),
  );
  return rawKey;
}

async function createEncryptedRecord(identity, body) {
  const record = {
    id: generateMessageId(identity.id),
    room: SECRET_REMOTE_CONFIG.room || SECRET_ROOM_NAME,
    author_id: identity.id,
    author_label: identity.label,
    body: '',
    created_at: new Date().toISOString(),
  };
  record.body = await encryptMessageBody(record, body);
  return record;
}

async function encryptMessageBody(record, body) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const payload = JSON.stringify({ body: String(body || '') });
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
      additionalData: encodeText(buildMessageAad(record)),
    },
    secretState.crypto.aesKey,
    encodeText(payload),
  );

  return JSON.stringify({
    v: SECRET_MESSAGE_BODY_VERSION,
    alg: 'AES-GCM',
    kid: 'secret-room-v1',
    nonce: bytesToBase64(nonce),
    ciphertext: bytesToBase64(ciphertext),
  });
}

async function decryptRecords(records) {
  const messages = [];
  let rejected = 0;

  for (const record of records) {
    try {
      const message = await decryptRecord(record);
      if (message) {
        messages.push(message);
      } else {
        rejected += 1;
      }
    } catch (_error) {
      rejected += 1;
    }
  }

  return { messages, rejected };
}

async function decryptRecord(record) {
  const envelope = parseEncryptedEnvelope(record.body);
  if (!envelope) {
    return null;
  }

  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToBytes(envelope.nonce),
      additionalData: encodeText(buildMessageAad(record)),
    },
    secretState.crypto.aesKey,
    base64ToBytes(envelope.ciphertext),
  );

  const payload = JSON.parse(decodeText(plaintext));
  const body = typeof payload.body === 'string' ? payload.body : '';
  if (!body) {
    return null;
  }

  return {
    id: record.id,
    room: record.room,
    author_id: record.author_id,
    author_label: record.author_label,
    body,
    created_at: record.created_at,
  };
}

function parseEncryptedEnvelope(value) {
  try {
    const envelope = JSON.parse(String(value || ''));
    if (
      envelope &&
      envelope.v === SECRET_MESSAGE_BODY_VERSION &&
      envelope.alg === 'AES-GCM' &&
      typeof envelope.nonce === 'string' &&
      typeof envelope.ciphertext === 'string'
    ) {
      return envelope;
    }
  } catch (_error) {
    return null;
  }
  return null;
}

function isEncryptedRecord(record) {
  return Boolean(normalizeRecord(record) && parseEncryptedEnvelope(record.body));
}

function normalizeRecord(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const id = String(record.id || '');
  const body = String(record.body || '');
  if (!id || !body) {
    return null;
  }

  return {
    id,
    room: String(record.room || SECRET_ROOM_NAME),
    author_id: String(record.author_id || ''),
    author_label: String(record.author_label || ''),
    body,
    created_at: String(record.created_at || new Date().toISOString()),
  };
}

function dedupeRecords(records) {
  const byId = new Map();
  for (const raw of records) {
    const record = normalizeRecord(raw);
    if (!record) {
      continue;
    }
    byId.set(record.id, record);
  }
  return [...byId.values()].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

function sortMessages(messages) {
  return [...messages]
    .filter(Boolean)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

function buildMessagesSignature(messages) {
  return messages.map((message) => `${message.id}|${message.created_at}|${message.body}`).join('\n');
}

function generateMessageId(authorId) {
  const random = new Uint8Array(8);
  crypto.getRandomValues(random);
  return `${authorId}-${Date.now()}-${bytesToHex(random)}`;
}

function persistLocalRecords(records) {
  const serialized = JSON.stringify(dedupeRecords(records).filter((record) => isEncryptedRecord(record)));
  try {
    localStorage.setItem(SECRET_ROOM_CACHE_KEY, serialized);
  } catch (_error) {
    // Ignore persistence failures.
  }
}

function readLocalRecords() {
  try {
    const primary = localStorage.getItem(SECRET_ROOM_CACHE_KEY);
    if (primary) {
      return dedupeRecords(JSON.parse(primary));
    }
  } catch (_error) {
    return [];
  }
  return [];
}

function clearLegacyLocalCaches() {
  try {
    for (const key of SECRET_ROOM_LEGACY_CACHE_KEYS) {
      localStorage.removeItem(key);
    }
    for (const identity of SECRET_IDENTITY_DEFINITIONS) {
      localStorage.removeItem(`${SECRET_DRAFT_KEY}.${identity.id}`);
    }
  } catch (_error) {
    // Ignore cleanup failures.
  }
}

function buildRemoteTableEndpoint() {
  const base = SECRET_REMOTE_CONFIG.supabaseUrl.replace(/\/+$/, '');
  return `${base}/rest/v1/secret_messages`;
}

function buildRemoteSelectEndpoint() {
  const room = encodeURIComponent(SECRET_REMOTE_CONFIG.room || SECRET_ROOM_NAME);
  return `${buildRemoteTableEndpoint()}?select=id,room,author_id,author_label,body,created_at&room=eq.${room}&order=created_at.asc`;
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

function buildRoomKeyAad(identityId) {
  return `assassinlike.secret.room-key.v1.${identityId}`;
}

function buildMessageAad(record) {
  return [
    'assassinlike.secret.message.v2',
    record.id,
    record.room || SECRET_ROOM_NAME,
    record.author_id,
    record.author_label,
    record.created_at,
  ].join('|');
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
  const digest = await crypto.subtle.digest('SHA-256', encodeText(value));
  return bytesToHex(new Uint8Array(digest));
}

function encodeText(value) {
  return new TextEncoder().encode(String(value || ''));
}

function decodeText(value) {
  return new TextDecoder().decode(value);
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const byte of array) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(String(value || ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
