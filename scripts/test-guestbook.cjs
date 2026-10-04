const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { webcrypto } = require('node:crypto');
const { test } = require('node:test');
const vm = require('node:vm');

const root = resolve(__dirname, '..');
function loadGuestbook() {
  const requests = [];
  const context = vm.createContext({
    window: { addEventListener() {}, SECRET_SPACE_CONFIG: { supabaseUrl: 'https://old.invalid' } },
    document: { addEventListener() {} },
    localStorage: { getItem() { return null; }, setItem() {} },
    crypto: webcrypto,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => [] };
    },
  });
  for (const file of ['guestbook-config.js', 'script.js']) {
    vm.runInContext(readFileSync(resolve(root, file), 'utf8'), context, { filename: file });
  }
  return { context, requests, evaluate: (code) => vm.runInContext(code, context) };
}

test('guestbook uses its own project and does not expose unconfigured sign-in buttons', () => {
  const { context, evaluate } = loadGuestbook();
  assert.equal(new URL(context.buildGuestbookTableEndpoint()).hostname, 'myrhtqbjnkxqaniuivzm.supabase.co');
  assert.equal(context.createGuestbookAuthClient(), null);
  assert.equal(context.renderGuestbookAuth(), '');
  evaluate("guestbookState.authReady = true; guestbookState.config.authProviders = ['github']");
  const html = context.renderGuestbookAuth();
  assert.match(html, /data-provider="github"/);
  assert.doesNotMatch(html, /data-provider="google"/);
});

test('publishable key stays in apikey; only a login session supplies the bearer token', () => {
  const { context, evaluate } = loadGuestbook();
  const anonymous = context.buildGuestbookHeaders();
  assert.match(anonymous.apikey, /^sb_publishable_/);
  assert.equal(anonymous.Authorization, undefined);
  evaluate("guestbookState.session = { access_token: 'test-session-token' }");
  const signedIn = context.buildGuestbookHeaders();
  assert.equal(signedIn.apikey, anonymous.apikey);
  assert.equal(signedIn.Authorization, 'Bearer test-session-token');
});

test('anonymous private submission keeps privacy and contains no account identity', async () => {
  const { context, requests } = loadGuestbook();
  const fields = {
    '#guestbook-status': { classList: { toggle() {} } },
    '#guestbook-body': { value: 'Private test message' },
    '#guestbook-anonymous': { checked: true },
    '#guestbook-public': { checked: false },
    '.guestbook-submit': { disabled: false },
  };
  await context.submitGuestbookMessage({ querySelector: (selector) => fields[selector] || null });
  assert.equal(requests.length, 1);
  const { options } = requests[0];
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.Prefer, 'return=minimal');
  assert.equal(options.headers.Authorization, undefined);
  const message = JSON.parse(options.body);
  assert.equal(message.is_public, false);
  assert.equal(message.auth_user_id, null);
  assert.equal(message.author_name, '');
  assert.equal(message.auth_provider, '');
  assert.equal(message.avatar_url, '');
  assert.equal(fields['.guestbook-submit'].disabled, false);
});

test('public list requests only public messages and network errors get readable text', async () => {
  const { context, requests } = loadGuestbook();
  await context.fetchGuestbookMessages();
  const url = new URL(requests[0].url);
  assert.equal(url.searchParams.get('is_public'), 'eq.true');
  assert.equal(context.formatGuestbookError(new TypeError('NetworkError when attempting to fetch resource.')),
    '留言服务暂时不可用。');
});
