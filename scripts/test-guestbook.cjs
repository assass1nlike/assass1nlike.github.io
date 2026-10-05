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
  evaluate("guestbookState.authReady = true");
  assert.match(context.renderGuestbookAuth(), /data-provider="github"/);
  assert.match(context.renderGuestbookAuth(), /data-provider="discord"/);
  assert.doesNotMatch(context.renderGuestbookAuth(), /data-provider="azure"/);
  assert.doesNotMatch(context.renderGuestbookAuth(), /data-provider="google"/);
  assert.match(context.renderGuestbookAuth(), /guestbook-email-form/);
  evaluate("guestbookState.config.authProviders = []; guestbookState.config.emailAuth = false");
  assert.equal(context.renderGuestbookAuth(), '');
  evaluate("guestbookState.authReady = true; guestbookState.config.authProviders = ['github']");
  const html = context.renderGuestbookAuth();
  assert.match(html, /data-provider="github"/);
  assert.doesNotMatch(html, /data-provider="google"/);
});

test('OAuth providers return to the current site with required scopes and retain identity', async () => {
  const { context, evaluate } = loadGuestbook();
  const calls = [];
  context.window.location = { origin: 'http://localhost:8000', pathname: '/' };
  context.window.supabase = { createClient: () => ({ auth: { signInWithOAuth: async (args) => { calls.push(args); return { error: null }; } } }) };
  for (const provider of ['github', 'google', 'azure', 'discord']) {
    await context.signInGuestbook(provider);
    assert.equal(calls.at(-1).provider, provider);
    assert.equal(calls.at(-1).options.redirectTo, 'http://localhost:8000/');
    assert.equal(calls.at(-1).options.scopes, provider === 'azure' ? 'email' : undefined);
    context.testUser = { id: 'test-user', app_metadata: { provider }, user_metadata: provider === 'github'
      ? { user_name: 'example', avatar_url: 'https://example.com/avatar.png' }
      : { full_name: 'Example User', preferred_username: 'private@example.com', picture: 'https://example.com/avatar.png' } };
    evaluate('guestbookState.user = testUser');
    const identity = context.getGuestbookIdentity(false);
    assert.equal(identity.userId, 'test-user');
    assert.equal(identity.publicName, provider === 'github' ? 'example' : 'Example User');
    assert.equal(identity.publicAvatarUrl, 'https://example.com/avatar.png');
    assert.equal(context.getGuestbookIdentity(true).publicName, '');
    assert.equal(context.getGuestbookIdentity(true).publicAvatarUrl, '');
  }
});

test('email form toggles beside OAuth and preserves pending verification', () => {
  const { context, evaluate } = loadGuestbook();
  evaluate('guestbookState.authReady = true');
  assert.match(context.renderGuestbookAuth(), /id="guestbook-email-form"[^>]*hidden/);
  let toggle;
  context.bindGuestbookAuthControls({
    querySelector: (selector) => selector === '#guestbook-email-toggle'
      ? { addEventListener: (_event, handler) => { toggle = handler; }, focus() {} } : null,
    querySelectorAll: () => [],
  });
  toggle();
  assert.equal(evaluate('guestbookState.emailLogin.expanded'), true);
  assert.doesNotMatch(context.renderGuestbookAuth(), /id="guestbook-email-form"[^>]*hidden/);
  evaluate("guestbookState.emailLogin.sent = true; guestbookState.emailLogin.email = 'private@example.com'");
  toggle();
  assert.equal(evaluate('guestbookState.emailLogin.sent'), true);
  toggle();
  assert.match(context.renderGuestbookAuth(), /name="token"/);
  assert.equal(evaluate('guestbookState.emailLogin.email'), 'private@example.com');
});

test('linked accounts display the most recently used provider instead of the original signup method', () => {
  const { context, evaluate } = loadGuestbook();
  context.testUser = {
    id: 'linked-user', app_metadata: { provider: 'email' }, user_metadata: { full_name: 'Discord Visitor' },
    identities: [
      { provider: 'email', last_sign_in_at: '2026-10-01T00:00:00Z' },
      { provider: 'discord', last_sign_in_at: '2026-10-05T00:00:00Z' },
    ],
  };
  evaluate('guestbookState.user = testUser; guestbookState.authReady = true');
  assert.equal(context.getGuestbookIdentity(false).provider, 'discord');
  assert.match(context.renderGuestbookAuth(), /Discord 已登录/);
  assert.doesNotMatch(context.renderGuestbookAuth(), /guestbook-nickname-form/);
  assert.equal(context.testUser.identities[0].provider, 'email');
  context.testUser.identities[0].last_sign_in_at = '2026-10-06T00:00:00Z';
  assert.equal(context.getGuestbookIdentity(false).provider, 'email');
  assert.match(context.renderGuestbookAuth(), /guestbook-nickname-form/);
});

test('provider email aliases are never used as public nicknames', () => {
  const { context, evaluate } = loadGuestbook();
  evaluate("guestbookState.user = { id: 'test', app_metadata: { provider: 'azure' }, user_metadata: { preferred_username: 'private@example.com', name: 'private@example.com' } }");
  assert.equal(context.getGuestbookIdentity(false).publicName, '已登录访客');
});

test('email OTP verifies the code before using a session and never exposes the email as a name', async () => {
  const { context, evaluate } = loadGuestbook();
  const calls = [];
  const user = { id: 'email-user', email: 'private@example.com', app_metadata: { provider: 'email' }, user_metadata: {} };
  const session = { access_token: 'email-session', user };
  context.window.supabase = { createClient: () => ({ auth: {
    signInWithOtp: async (args) => { calls.push(args); return { error: null }; },
    verifyOtp: async (args) => { calls.push(args); return { data: { session }, error: null }; },
    updateUser: async ({ data }) => ({ data: { user: { ...user, user_metadata: data } }, error: null }),
  } }) };
  await context.signInGuestbookEmail(' private@example.com ');
  assert.equal(calls[0].email, 'private@example.com');
  assert.equal(calls[0].options.shouldCreateUser, true);
  assert.equal(evaluate('guestbookState.user'), null);
  assert.equal(evaluate('guestbookState.emailLogin.sent'), true);
  await context.signInGuestbookEmail('private@example.com', '12345678');
  assert.equal(calls[1].token, '12345678');
  assert.equal(calls[1].type, 'email');
  assert.equal(context.buildGuestbookHeaders().Authorization, 'Bearer email-session');
  assert.equal(context.getGuestbookIdentity(false).publicName, '已登录访客');
  await context.saveGuestbookNickname('  数学访客  ');
  assert.equal(context.getGuestbookIdentity(false).publicName, '数学访客');
  assert.equal(context.getGuestbookIdentity(true).publicName, '');
  assert.equal(context.getGuestbookIdentity(false).publicAvatarUrl, '');
});

test('failed email send or verification does not create a logged-in state and allows retry', async () => {
  const { context, evaluate } = loadGuestbook();
  context.window.supabase = { createClient: () => ({ auth: {
    signInWithOtp: async () => ({ error: new Error('SMTP unavailable') }),
    verifyOtp: async () => ({ error: new Error('Code expired') }),
  } }) };
  await context.signInGuestbookEmail('private@example.com');
  assert.equal(evaluate('guestbookState.emailLogin.sent'), false);
  assert.equal(evaluate('guestbookState.emailLogin.busy'), false);
  assert.equal(evaluate('guestbookState.authError'), 'SMTP unavailable');
  evaluate('guestbookState.emailLogin.sent = true');
  await context.signInGuestbookEmail('private@example.com', '123456');
  assert.equal(evaluate('guestbookState.session'), null);
  assert.equal(evaluate('guestbookState.emailLogin.sent'), true);
  assert.equal(evaluate('guestbookState.emailLogin.busy'), false);
  assert.equal(evaluate('guestbookState.authError'), 'Code expired');
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
