/* Reading counts and inline annotations, both on the same Supabase project as the guestbook. */
window.ReaderData = (() => {
  const SEEN_KEY = 'assassinlike.reader.views.v1';
  let client;
  let ready;

  function config() {
    const raw = window.GUESTBOOK_CONFIG || {};
    const url = String(raw.supabaseUrl || '').trim().replace(/\/+$/, '');
    const key = String(raw.supabaseAnonKey || '').trim();
    return url && key ? { url, key } : null;
  }

  // One auth client per tab: the guestbook reads the same global, so a reader who signed in
  // there is signed in here, and two clients never refresh the same token at once.
  async function ensure() {
    if (ready) return ready;
    ready = (async () => {
      const settings = config();
      if (!settings || !window.supabase?.createClient) return null;
      client = window.__supabaseAuthClient ||= window.supabase.createClient(settings.url, settings.key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
      await client.auth.getSession();
      return client;
    })();
    return ready;
  }

  async function headers() {
    const c = await ensure();
    const { data } = await c.auth.getSession();
    const token = data?.session?.access_token;
    return {
      apikey: config().key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  function alreadyCounted(path) {
    try {
      const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
      const today = new Date().toISOString().slice(0, 10);
      return seen[path] === today;
    } catch { return false; }
  }

  function rememberCounted(path) {
    try {
      const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
      const today = new Date().toISOString().slice(0, 10);
      for (const key of Object.keys(seen)) if (seen[key] !== today) delete seen[key];
      seen[path] = today;
      localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    } catch { /* Counting still works; it just repeats on reload. */ }
  }

  // One view per document per browser per day; a reload is not a new reader.
  async function countView(path) {
    const c = await ensure();
    if (!c || alreadyCounted(path)) return null;
    try {
      const response = await fetch(`${config().url}/rest/v1/rpc/record_page_view`, {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({ p_path: path }),
      });
      if (!response.ok) return null;
      rememberCounted(path);
      return Number(await response.json());
    } catch { return null; }
  }

  async function viewCount(path) {
    const c = await ensure();
    if (!c) return null;
    try {
      const response = await fetch(
        `${config().url}/rest/v1/page_views?select=views&path=eq.${encodeURIComponent(path)}`,
        { headers: await headers() },
      );
      if (!response.ok) return null;
      const rows = await response.json();
      return rows.length ? Number(rows[0].views) : 0;
    } catch { return null; }
  }

  function loadAnnotations(path) {
    return ensure().then(async (c) => {
      if (!c) return [];
      const response = await fetch(
        `${config().url}/rest/v1/page_annotations?select=id,quote,prefix,suffix,body,author_name,avatar_url,created_at,auth_user_id&path=eq.${encodeURIComponent(path)}&order=created_at&limit=500`,
        { headers: await headers() },
      );
      if (!response.ok) return [];
      return response.json();
    }).catch(() => []);
  }

  async function addAnnotation(path, anchor, body) {
    const c = await ensure();
    if (!c) throw new Error('批注服务未配置。');
    const { data } = await c.auth.getSession();
    const user = data?.session?.user;
    if (!user) throw new Error('登录后才能批注。');
    const meta = user.user_metadata || {};
    const name = [meta.display_name, meta.user_name, meta.full_name, meta.name]
      .map((value) => String(value || '').trim())
      .find((value) => value && !value.includes('@')) || '';
    const response = await fetch(`${config().url}/rest/v1/page_annotations`, {
      method: 'POST',
      headers: { ...(await headers()), Prefer: 'return=representation' },
      body: JSON.stringify({
        path,
        quote: anchor.quote,
        prefix: anchor.prefix,
        suffix: anchor.suffix,
        body,
        auth_user_id: user.id,
        author_name: name.slice(0, 40),
        avatar_url: String(meta.avatar_url || meta.picture || '').slice(0, 500),
      }),
    });
    if (!response.ok) throw new Error(`保存失败 (${response.status})`);
    const rows = await response.json();
    return rows[0];
  }

  async function removeAnnotation(id) {
    const c = await ensure();
    if (!c) return false;
    const response = await fetch(
      `${config().url}/rest/v1/page_annotations?id=eq.${encodeURIComponent(id)}`,
      { method: 'DELETE', headers: await headers() },
    );
    return response.ok;
  }

  async function currentUser() {
    const c = await ensure();
    if (!c) return null;
    const { data } = await c.auth.getSession();
    return data?.session?.user || null;
  }

  return { countView, viewCount, loadAnnotations, addAnnotation, removeAnnotation, currentUser };
})();
